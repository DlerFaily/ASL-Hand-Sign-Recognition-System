# ASL Hand-Sign Recognition System

A real-time American Sign Language (ASL) alphabet recognition and learning platform using AI and computer vision. This system combines interactive learning with advanced machine learning to help users practice and master ASL hand signs.

**Live Deployment:** https://app-63h9g.ondigitalocean.app/login

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Target Users](#target-users)
3. [Key Features](#key-features)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Project Setup](#project-setup)
7. [Running the Application](#running-the-application)
8. [Admin Guide](#admin-guide)
9. [Deployment](#deployment)
10. [License](#license)
11. [Contributing](#contributing)
12. [Acknowledgements](#acknowledgements)

---

## Project Overview

The ASL Hand-Sign Recognition System is a full-stack web application designed to recognize and teach American Sign Language signs using real-time hand tracking and deep learning. The system utilizes Google's MediaPipe HandLandmarker for robust hand detection across diverse lighting conditions and skin tones, combined with an LSTM-based neural network for sign classification.

### Core Objectives

- Recognize all types of ASL hand signs (alphabet, numbers, and common phrases)
- Provide interactive learning mode with real-time feedback
- Enable administrators to train, retrain, and deploy ML models
- Support manual data collection for model improvement
- Ensure accessibility and inclusive communication

---

## Target Users

### ASL Learners
Individuals wanting to practice the ASL alphabet with interactive feedback and progress tracking.

### Educators
Teachers needing tools to help students practice ASL in classroom settings.

### Hearing Individuals
People interested in understanding and learning basic ASL communication.

### Accessibility Advocates
Organizations promoting inclusive communication and accessibility initiatives.

---

## Key Features

### Learning Mode (End Users)
- **Real-time Sign Recognition:** Live prediction feedback as users perform signs
- **Example Guidance:** Visual demonstrations of target signs
- **Performance Statistics:** Track success/failure rates for each sign
- **Progression System:** Monitor mastered vs. unlearned signs
- **Camera Integration:** Seamless webcam access with permission handling
- **Dynamic & Static Signs:** Support for single frames and video sequences

### Admin Interface
- **Model Management:** Upload, train, retrain, and deploy models
- **Data Collection:** Capture hand landmarks using MediaPipe
- **Performance Testing:** Manually test model accuracy on datasets
- **Version Control:** Deploy new models or rollback to previous versions
- **Training Configuration:** Adjust epochs, batch sizes, and other hyperparameters

---

## System Architecture
The application is split into three main parts:
- Frontend: React + TypeScript app located in the `web/` folder; handles the webcam, user interactions and visualization.
- Backend: Django REST API located in the `server/` folder; serves APIs, stores metadata and manages uploaded datasets and trained model references.
- Machine Learning: training and inference utilities in the `ml/` folder; models are saved to `ml/models/` and served or used by the backend as needed.

For a full overview of the system architecture as well as the requirements that shape the system, click [here](https://git.chalmers.se/courses/dit826/2025/team7/-/wikis/home).    

---

## Technology Stack

### Frontend
- **Framework:** React 19.2.0 with TypeScript
- **Styling:** Tailwind CSS 4.1.17
- **Vision:** MediaPipe Tasks Vision 0.10.22
- **HTTP Client:** Axios 1.13.2
- **Router:** React Router DOM 7.9.6

### Backend
- **Framework:** Django 4.2+ with Channels (WebSocket support)
- **API:** Django REST Framework
- **ML Frameworks:** TensorFlow/Keras, scikit-learn
- **Computer Vision:** OpenCV, MediaPipe
- **Database:** SQLite
- **Async:** Daphne ASGI server

### Machine Learning
- **Model Architecture:** LSTM (Recurrent Neural Network)
- **Input:** Normalized hand landmark vectors
- **Output:** ASL sign classification
- **Accuracy Target:** >80% on ASL alphabet
- **Training:** Mini-batch gradient descent with Adam optimizer

### DevOps & Deployment
- **Containerization:** Docker
- **Orchestration/Deployment:** DigitalOcean App Platform
- **CI/CD:** GitLab CI/CD Pipeline
- **Repository:** GitLab
- **Testing:** Unit tests integrated in CI/CD

---

## Project Setup

### Prerequisites

- **Node.js:** 20.0.0 or higher
- **Python:** 3.9 or higher
- **Docker:** Latest version
- **Docker Compose:** Latest version
- **Git:** For version control

### Installation

#### 1. Clone the Repository

```zsh
git clone <repository-url>
cd <project-name>
```

#### 2. Backend Setup

```zsh
cd server
pip install -r requirements.txt
```

#### 3. Frontend Setup

```zsh
cd web
npm install
```

---

## Running the Application

### Option 1: Full Stack with Docker Compose (Recommended)

From the root directory:

```zsh
docker compose up --build
```

This will start:
- React frontend on `http://localhost:5173`
- Django backend on `http://localhost:8000`
- SQLite database with persistent storage

To stop and clean up:

```zsh
docker compose down
```

### Option 2: Local Development

#### Start Backend (Terminal 1)

```zsh
cd server
daphne dit826.asgi:application
```

The backend will be available at `http://localhost:8000`

#### Start Frontend (Terminal 2)

```zsh
cd web
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Option 3: Production Build

Backend:
```zsh
cd server
chmod +x ./run.sh
./run.sh
```

Frontend:
```zsh
cd web
npm run build
npm run preview
```

---

## Admin Guide

### Adding New ASL Signs

1. Collect training data using the Admin Interface data collection tool
2. Export landmarks as CSV files
3. See the guide for training/retraining/testing to see how to use the CSV files

### Adding new labels

1. Gather appropriate images for the new labels that you want to add
2. Head to the labels section of the admin dashboard
3. Create names for the new labels and upload the correct image to each

### Testing accuracy

1. Collect appropriate data in the .csv format that you want to test a model on
2. Choose the model you want to test and activate it from the model control dashboard
3. Go to the testing section of the admin dashboard
4. Upload the .csv data and wait to see the results of how the model performed on that data.

### Training/Retrainging models

1. Collect appropriate data in the .csv format that you want to train/retrain a model on
2. Go to the section specified for training/retraining
3. If training a new model from scratch, upload the data and choose for how many epochs you want the model to be trained
4. If retraining an existing model, choose which model to retrain, upload the data and choose for how many epochs you want the model to be retrained
5. Enjoy your newly trained model.

---

## Deployment

### Docker Containerization

Build image:
```zsh
docker build -t <project-name>:latest .
```

Run container:
```zsh
docker run -p 8000:8000 -p 5173:5173 <project-name>:latest
```

### Digital Ocean Deployment

The application is deployed on DigitalOcean App Platform. The platform automatically handles containerization, builds, and manages the application infrastructure based on the provided docker-compose configuration.
The deployment process is automated through GitLab integration. When changes are pushed to the main branch, DigitalOcean automatically detects the updates, builds the Docker containers, and deploys the services. The platform manages both the React frontend and Django backend as separate services, with the database persisted in a dedicated volume.
The application includes health checks and automatic rollback capabilities. In the event of a failed deployment, the previous stable version is maintained and can be restored through the DigitalOcean App Platform dashboard. Environment variables and sensitive configuration are managed securely through the platform's dashboard.
Live deployment is accessible at http://34.88.161.175/

---

## License
This project is developed by Team 7. For questions, reach out to the project maintainers via the repository issue tracker or emails.
The project is licensed under the [MIT license](LICENSE).

---

## Contributing
- Please follow the repository coding style and add tests for new functionality.
- Open issues and merge requests should target the `development` branch; provide reproducible steps and any sample data required.

### For example:

1. Create an issue that describes your idea
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a merge request


### Where to look next
- Frontend entry: `web/src/main.tsx` and `web/src/App.tsx`
- Backend entry: `server/manage.py` and `server/dit826/settings.py`
- ML utilities: `ml/train.py`, `ml/collect.py`, `ml/app.py`

---

## Acknowledgements
This system combines open-source libraries (Django, React, TensorFlow/Keras, OpenCV) and was designed to be extendable for new datasets, labels and model architectures.