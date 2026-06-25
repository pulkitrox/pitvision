# 🏎️ PitVision AI

PitVision AI is a machine learning-powered web application that predicts the probability of a Formula 1 driver making a pit stop on the next lap. The project combines historical race telemetry, feature engineering, and ensemble machine learning models with a modern interactive web interface.

## 🚀 Live Demo

URL : https://pitvision.onrender.com

---

## 📌 Project Overview

PitVision AI analyzes race conditions and predicts whether a driver is likely to pit on the upcoming lap. The prediction is based on race telemetry, tyre information, driver status, track conditions, and historical performance.

The application is intended to demonstrate the practical application of machine learning in motorsports analytics while showcasing a complete end-to-end deployment of an ML system.

---

## ✨ Features

* Predicts next-lap pit stop probability
* Confidence score for each prediction
* Interactive Formula 1-inspired dashboard
* Responsive modern UI
* FastAPI backend serving trained ML models
* React frontend with real-time API integration
* MongoDB integration for prediction history
* Deployed on Render

---

## 🛠️ Tech Stack

### Frontend

* React
* CRACO
* Tailwind CSS
* Framer Motion
* React Query
* Axios
(Developed using Emergent Agentic AI)
### Backend

* FastAPI
* Uvicorn
* Python

### Machine Learning

* Scikit-learn
* LightGBM
* XGBoost
* Stacking Classifier
* Joblib
* Pandas
* NumPy

### Database

* MongoDB

### Deployment

* Render
* GitHub

---

## 🤖 Machine Learning Pipeline

The prediction model follows a complete machine learning workflow:

1. Data preprocessing
2. Feature engineering
3. Categorical encoding
4. Model training
5. Hyperparameter tuning using RandomSearchCV
6. Ensemble learning using a Stacking Classifier
7. Model serialization using Joblib
8. Deployment through FastAPI

---

## 📊 Model Performance

| Metric    | Score            |
| --------- | ---------------- |
| Accuracy  | 0.97007349656880 |
| Precision | 0.48496835443037 |
| Recall    | 0.87696709585121 |
| F1 Score  | 0.62455425369332 |
| ROC-AUC   | 0.98451314841041 |

---

## 📁 Project Structure

```text
PitVision/
│
├── backend/
│   ├── models/
│   ├── server.py
│   ├── predict_service.py
│   ├── requirements.txt
│   └── runtime.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── yarn.lock
│
├── notebooks/
│
├── README.md
└── .gitignore
```

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/pitvision.git
cd pitvision
```

---

### Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt

uvicorn server:app --reload
```

---

### Frontend Setup

```bash
cd frontend

yarn install

yarn start
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=your_database_name
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🚀 Deployment

The application is deployed using **Render**.

### Backend

* Python Web Service
* FastAPI
* Uvicorn

### Frontend

* Static Site
* React Build

---

## 📈 Future Improvements

* Live race telemetry integration
* Weather data incorporation
* Driver-specific strategy recommendations
* Multi-lap pit prediction
* Safety Car and Virtual Safety Car prediction
* Race strategy simulation
* Driver comparison dashboard

---

## 📚 Dataset

The model is trained using historical Formula 1 race telemetry and pit stop information with engineered features including:
Kaggle Dataset : https://www.kaggle.com/datasets/aadigupta1601/f1-strategy-dataset-pit-stop-prediction

* Driver
* Team
* Circuit
* Tyre Compound
* Tyre Age
* Lap Number
* Position
* Historical Pit Strategy

and much more...

---

## 👨‍💻 Author

**Pulkit Gupta**

GitHub: https://github.com/pulkitrox

LinkedIn: https://www.linkedin.com/in/pulkit-gupta-1861b1322/

---

## 📄 License

This project is intended for educational and portfolio purposes.
