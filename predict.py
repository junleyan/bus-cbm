import torch
import numpy as np
import cv2
import io
from PIL import Image

import detectron2
from detectron2.utils.logger import setup_logger
from detectron2.data.datasets import load_coco_json
from detectron2 import model_zoo
from detectron2.engine import DefaultPredictor, default_argument_parser, \
                              default_setup, hooks, launch, DefaultTrainer, HookBase, default_writers
from detectron2.config import CfgNode as CN, get_cfg
from detectron2.modeling import build_model
import detectron2.utils.comm as comm
from detectron2.utils.visualizer import Visualizer, ColorMode
from detectron2.solver import build_lr_scheduler, build_optimizer
from detectron2.data import detection_utils as utils, build_detection_test_loader, DatasetMapper, \
                            build_detection_train_loader, MetadataCatalog, DatasetCatalog
from detectron2.evaluation import COCOEvaluator, inference_on_dataset
from detectron2.checkpoint import DetectionCheckpointer, PeriodicCheckpointer
from detectron2.utils.events import EventStorage

logger = setup_logger()

import sys
sys.path.append("../")

from modules import CBMCOCOEvaluator, CustomMapper, add_cbm_config, add_uhcc_config, MyVisualizer


def predict_image(image_path, include_predictions=True):
    # Read image from filepath
    image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Could not read image at provided path")

    # If predictions are not requested, skip model setup and only return original image bytes
    if not include_predictions:
        original_image = Image.fromarray(image[:, :, ::-1])
        original_image_buffer = io.BytesIO()
        original_image.save(original_image_buffer, format='PNG')
        original_image_bytes = original_image_buffer.getvalue()
        return None, None, original_image_bytes
    
    # Set up model configuration
    cfg3c = get_cfg()
    cfg3c.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_101_FPN_3x.yaml"))
    add_uhcc_config(cfg3c)
    add_cbm_config(cfg3c)
    cfg3c.merge_from_file("configs/stage_3c.yaml")
    cfg3c.DATALOADER.NUM_WORKERS = 0
    cfg3c.MODEL.DEVICE = 'cpu'
    cfg3c.TEST.DETECTIONS_PER_IMAGE = 1
    
    # Build and load the model
    model3c = build_model(cfg3c)
    model3c.eval()
    
    # Load the trained weights
    checkpoint = torch.load("weights/stage_3c_weights.pth", map_location="cpu")
    model3c.load_state_dict(checkpoint["model"])
    
    # Prepare metadata for visualization without registering a dataset
    meta = MetadataCatalog.get("bus_cbm_meta")
    meta.shape_classes = ['oval', 'not oval']
    meta.orientation_classes = ['parallel', 'not parallel']
    meta.margin_classes = ['circumscribed', 'not circumscribed']
    meta.echo_classes = ['anechoic', 'not anechoic']
    meta.posterior_classes = ['no features', 'features']
    meta.cancer_classes = ['benign', 'malignant']
    meta.thing_colors = ["g", "m"]
    meta.thing_classes = ['lesion']
    
    # Avoid file I/O: directly create the processed data dict with in-memory image
    processed_data = {
        'image': torch.as_tensor(np.ascontiguousarray(image.transpose(2, 0, 1))),  # BGR tensor CxHxW
        'image_id': 0,
        'height': image.shape[0],
        'width': image.shape[1],
    }
    
    # Run prediction
    with torch.no_grad():
        predictions = model3c([processed_data])
    
    # Create visualizer using the processed image data
    visualizer = MyVisualizer(np.transpose(processed_data['image'].numpy(), (1, 2, 0)), 
                             metadata=MetadataCatalog.get("bus_cbm_meta"), 
                             scale=0.8, 
                             show_lesion=True)
    
    # Draw predictions
    if len(predictions[0]['instances']) > 0:
        instances = predictions[0]['instances']
        metadata = {
            "malignancy": round(instances.cancer_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("cancer_scores") else None,
            "shape": round(instances.shape_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("shape_scores") else None,
            "margin": round(instances.margin_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("margin_scores") else None,
            "orientation": round(instances.orient_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("orient_scores") else None,
            "echo": round(instances.echo_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("echo_scores") else None,
            "posterior": round(instances.post_scores.detach().cpu().numpy().tolist()[0], 2) if instances.has("post_scores") else None,
        }
        output_image = visualizer.draw_instance_predictions(predictions[0]['instances'])
        
        # Convert the output to PIL Image
        result_image = Image.fromarray(output_image.get_image()[:, :, ::-1])
        
        # Convert PIL Image to bytes
        img_buffer = io.BytesIO()
        result_image.save(img_buffer, format='PNG')
        img_bytes = img_buffer.getvalue()

        original_image = Image.fromarray(image[:, :, ::-1])
        original_image_buffer = io.BytesIO()
        original_image.save(original_image_buffer, format='PNG')
        original_image_bytes = original_image_buffer.getvalue()

        return img_bytes, metadata, original_image_bytes
    else:
        print("No predictions found in the image")
        return None, None, None


def predict_image_with_concepts(image_path, concept_scores_dict, sigmoid_applied=True):
    """
    Predict on an image and recompute malignancy using provided concept scores.

    Args:
        image_path (str): Path to the image file.
        concept_scores_dict (dict): Dictionary with keys 'shape', 'margin', 'orientation', 'echo', 'posterior'
            and float values in [0,1] representing the UI slider probabilities.
        sigmoid_applied (bool): If True, provided concept scores are probabilities and will be passed through logit
            before the concept-only model. If False, values are assumed to already be in the model's input space.

    Returns:
        (img_bytes, metadata, original_image_bytes): Same tuple as predict_image, but with malignancy replaced
            by the recomputed value from the concept-only head.
    """
    # Read image
    image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not read image at provided path")

    # Set up model configuration
    cfg3c = get_cfg()
    cfg3c.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_101_FPN_3x.yaml"))
    add_uhcc_config(cfg3c)
    add_cbm_config(cfg3c)
    cfg3c.merge_from_file("configs/stage_3c.yaml")
    cfg3c.DATALOADER.NUM_WORKERS = 0
    cfg3c.MODEL.DEVICE = 'cpu'
    cfg3c.TEST.DETECTIONS_PER_IMAGE = 1

    # Build and load model
    model3c = build_model(cfg3c)
    model3c.eval()
    checkpoint = torch.load("weights/stage_3c_weights.pth", map_location="cpu")
    model3c.load_state_dict(checkpoint["model"])

    # Prepare concept vector in the order: shape, margin, orientation, echo, posterior
    # Values are expected in [0,1] if sigmoid_applied is True (UI probabilities)
    concepts_order = [
        concept_scores_dict.get("shape"),
        concept_scores_dict.get("margin"),
        concept_scores_dict.get("orientation"),
        concept_scores_dict.get("echo"),
        concept_scores_dict.get("posterior"),
    ]
    if any(v is None for v in concepts_order):
        missing = [k for k, v in zip(["shape", "margin", "orientation", "echo", "posterior"], concepts_order) if v is None]
        raise ValueError(f"Missing concept scores for keys: {missing}")

    x = torch.tensor(concepts_order, dtype=torch.float32, device="cpu").unsqueeze(0)
    if sigmoid_applied:
        # numeric stability: clamp into (0,1)
        eps = 1e-6
        x = torch.clamp(x, eps, 1 - eps)
        x = torch.logit(x)

    with torch.no_grad():
        # Run detection to obtain instances for visualization
        processed_data = {
            'image': torch.as_tensor(np.ascontiguousarray(image.transpose(2, 0, 1))),
            'image_id': 0,
            'height': image.shape[0],
            'width': image.shape[1],
        }
        predictions = model3c([processed_data])

        # Compute malignancy using the concept-only model
        concept_only_model = model3c.roi_heads.cancer_head.second_model
        concept_only_model.eval()
        malignancy_logit = concept_only_model(x)
        malignancy_prob = torch.sigmoid(malignancy_logit).flatten()[0].item()

    # Prepare metadata and visualization
    meta = MetadataCatalog.get("bus_cbm_meta")
    meta.shape_classes = ['oval', 'not oval']
    meta.orientation_classes = ['parallel', 'not parallel']
    meta.margin_classes = ['circumscribed', 'not circumscribed']
    meta.echo_classes = ['anechoic', 'not anechoic']
    meta.posterior_classes = ['no features', 'features']
    meta.cancer_classes = ['benign', 'malignant']
    meta.thing_colors = ["g", "m"]
    meta.thing_classes = ['lesion']

    if len(predictions[0]['instances']) > 0:
        instances = predictions[0]['instances']

        # Override malignancy score in the instances so downstream visualization/metadata use the new value
        try:
            existing_device = instances.cancer_scores.device if instances.has("cancer_scores") else torch.device("cpu")
        except AttributeError:
            existing_device = torch.device("cpu")
        instances.set("cancer_scores", torch.tensor([malignancy_prob], dtype=torch.float32, device=existing_device))

        metadata = {
            "malignancy": round(malignancy_prob, 2),
            "shape": round(concepts_order[0], 2),
            "margin": round(concepts_order[1], 2),
            "orientation": round(concepts_order[2], 2),
            "echo": round(concepts_order[3], 2),
            "posterior": round(concepts_order[4], 2),
        }
        return metadata
    else:
        print("No predictions found in the image")
        return None

if __name__ == "__main__":
    # Example usage
    # For FastAPI integration:
    # image_bytes = predict_image(uploaded_file.read())
    
    print("Prediction function ready. Use predict_image() to run predictions.")
