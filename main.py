from pathlib import Path
from datetime import datetime
import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Import the predict_image function
from predict import predict_image, predict_image_with_concepts

app = FastAPI(title="BUS-CBM Inference API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

samples_dir = 'sample_data'
annotated_file = 'annotated.json'

@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/get-samples")
def get_samples():
    path = Path(samples_dir)

    # Build quick-lookup sets of annotated filenames for each mode
    manual_set = set()
    interactive_set = set()
    visible_set = set()
    if os.path.exists(annotated_file):
        try:
            with open(annotated_file, 'r') as f:
                data = json.load(f)
                for entry in data.get("manual", []) or []:
                    # entry shape: { filename: [history] }
                    if isinstance(entry, dict):
                        for k, v in entry.items():
                            # consider annotated if history exists (any list)
                            if isinstance(v, list):
                                manual_set.add(k)
                for entry in data.get("interactive", []) or []:
                    if isinstance(entry, dict):
                        for k, v in entry.items():
                            if isinstance(v, list):
                                interactive_set.add(k)
                for entry in data.get("visible", []) or []:
                    if isinstance(entry, dict):
                        for k, v in entry.items():
                            if isinstance(v, list):
                                visible_set.add(k)
        except Exception:
            # If the annotated file is unreadable/corrupt, treat as none annotated
            manual_set = set()
            interactive_set = set()
            visible_set = set()

    files = []
    for f in path.iterdir():
        if f.is_file() and f.suffix != '.json':
            stat = f.stat()
            created = datetime.fromtimestamp(stat.st_ctime)
            filename = f.name
            files.append({
                "filename": filename,
                "date_added": created.isoformat(),
                "manually_annotated": filename in manual_set,
                "visually_annotated": filename in visible_set,
                "interactive_annotated": filename in interactive_set,
            })
    return {"files": files}


@app.get("/predict-image", response_class=JSONResponse)
async def predict_endpoint(path: str, includePredictions: bool = False):
    try:
        result = predict_image(samples_dir + '/' + path, include_predictions=includePredictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    # When predictions are requested, ensure we have valid prediction outputs
    if includePredictions:
        if result is None or result[0] is None or result[1] is None or result[2] is None:
            raise HTTPException(status_code=422, detail="No predictions found in the image")

    # Return base64 image and metadata
    import base64
    result_bytes, metadata, original_image_bytes = result
    original_image_b64 = base64.b64encode(original_image_bytes).decode("utf-8") if original_image_bytes is not None else None
    content = {
        "original_image_base64": original_image_b64,
    }
    if includePredictions and result_bytes is not None and metadata is not None:
        img_b64 = base64.b64encode(result_bytes).decode("utf-8")
        content.update({
            "image_base64": img_b64,
            "metadata": metadata
        })
    return JSONResponse(content=content)


@app.get("/predict-image-with-concepts", response_class=JSONResponse)
async def predict_with_concepts_endpoint(path: str, concept_scores: str, sigmoid_applied: bool = True):
    """
    Predict on an image with custom concept scores.
    
    Query parameters:
    - path: image filename
    - concept_scores: JSON string with concept scores
    - sigmoid_applied: boolean, defaults to true
    """
    try:
        # Parse concept scores from JSON string
        import json
        concept_scores_dict = json.loads(concept_scores)
        
        # Validate concept scores
        required_keys = ["shape", "margin", "orientation", "echo", "posterior"]
        missing_keys = [key for key in required_keys if key not in concept_scores_dict]
        if missing_keys:
            raise HTTPException(status_code=400, detail=f"Missing concept scores for: {missing_keys}")
        
        # Validate concept score values are between 0 and 1
        for key, value in concept_scores_dict.items():
            if not isinstance(value, (int, float)) or not (0 <= value <= 1):
                raise HTTPException(status_code=400, detail=f"Concept score '{key}' must be a number between 0 and 1")
        
        result = predict_image_with_concepts(
            samples_dir + '/' + path, 
            concept_scores_dict, 
            sigmoid_applied=sigmoid_applied
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    if result is None:
        raise HTTPException(status_code=422, detail="No predictions found in the image")

    # Return metadata
    metadata = result
    return {"metadata": metadata}


@app.get("/save")
def save_endpoint(path: str, mode: str, history: str):
    """
    Save metadata history for a file in a specific mode.
    
    Query parameters:
    - path: image filename
    - mode: 'manual', 'interactive', or 'visible'
    - history: JSON string containing the metadata history array
    """
    try:
        # Validate mode
        valid_modes = ['manual', 'interactive', 'visible']
        if mode not in valid_modes:
            raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
        
        # Parse history from JSON string
        try:
            history_data = json.loads(history)
            if not isinstance(history_data, list):
                raise HTTPException(status_code=400, detail="History must be a JSON array")
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON in history parameter: {str(e)}")
        
        # Read existing annotated.json if it exists
        annotated_data = {
            "manual": [],
            "interactive": [],
            "visible": []
        }
        
        if os.path.exists(annotated_file):
            try:
                with open(annotated_file, 'r') as f:
                    existing_data = json.load(f)
                    # Ensure all modes exist in the data
                    for mode_key in valid_modes:
                        if mode_key in existing_data:
                            annotated_data[mode_key] = existing_data[mode_key]
            except (json.JSONDecodeError, KeyError) as e:
                # If file is corrupted or invalid, start fresh
                pass
        
        # Find and update existing entry for this filename in the specified mode
        updated = False
        for entry in annotated_data[mode]:
            if path in entry:
                entry[path] = history_data
                updated = True
                break
        
        # If not found, add new entry
        if not updated:
            annotated_data[mode].append({path: history_data})
        
        # Write back to file
        with open(annotated_file, 'w') as f:
            json.dump(annotated_data, f, indent=2)
        
        return {"status": "success", "message": f"Saved metadata history for {path} in {mode} mode"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # Run the app: uvicorn main:app --host 0.0.0.0 --port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
