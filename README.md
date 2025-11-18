# BI-RADS CBM
---
## Learning a Clinically-Relevant Concept Bottleneck for Lesion Detection in Breast Ultrasound 
###### Github repository containing all relevant code for MICCAI 2024 submission 
This repository is designed to provide implementations of the training and validation scripts for our breast ultrasound (BUS) concept bottleneck model (CBM) from the ACR Breast Imaging and Reporting Data System (BI-RADS) masses lexicon for ultrasound, for lesion detection, description, and cancer classification. 

### Architecture overview:
![Architecture Diagram](images/new_colors_fig_1.svg)

### Results
![AUROC Performance Plot](images/output_auroc_plot.svg)

## Installation and system requirements
- Tested on Ubuntu 20.04.6 LTS
- Python version: 3.9.16
- To install dependencies, run:
```python3
python setup.py install
```
## Demo
- Demo scripts are provided in the outermost folder.
- Model architectures are provided via the configs folder. 
- A demo dataset is provided purely to validate model functionality, the dataset is not representative of the complete dataset used to train/evaluate the models in the manuscript. 
- To validate code functionality, run sample code in notebook corresponding to desired functionality (e.g. for an example of how to load and test pretrained models)
    - `model_eval.ipynb` for sample COCO-style evaluation scripts
    - `model_train.py` for sample model training script

## Reader UI Setup
### 1. Install NVM (Node Version Manager)
```
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
### 2. Load NVM into the current shell
```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```
### 3. Install and use the latest LTS Node.js version
```
nvm install --lts
nvm use --lts
```
### (Optional) Verify installation
```
node -v
npm -v
```
### 4. Navigate to the web application project directory
```
cd reader-ui
```
### 5. Create .env
```
NEXT_PUBLIC_API_URL=http://localhost:8000 # URL of your Python FastAPI REST API
```
### 6. Install dependencies and build the web application
```
npm install
npm run build
```
### 7. Return to the project root and start the application
```
sh start.sh
```
### 8. Access the application
Once both the FastAPI backend and Next.js frontend are running, open:
```
http://localhost:3000
```
### Notes
- Place the image you want to annotate in the `sample_data/` directory.
- Saved annotations are stored in `annotated.json`.

### Application Views
| Route         | AI Output | Sliders | Description                                         |
|---------------|----------|--------|-----------------------------------------------------|
| `/`           | No       | No     | Standard view, no AI or adjustments      |
| `/manual`     | No       | No     | Standard view, no AI or adjustments                              |
| `/visible`    | Yes      | No     | AI output, no adjustments             |
| `/interactive`| Yes      | Yes    | AI output with adjustments sliders        |
