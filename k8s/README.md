# Kubernetes Setup

## Prerequisites

- Kubernetes cluster (local: Docker Desktop, minikube, or remote cluster)
- `kubectl` CLI installed
- Docker images built and available to the cluster

## Setting up kubernetes in Docker

To enable kubernetes in Docker desktop go to ***Settings -> Kubernetes*** and press the enable button

## Building Docker Images

Before deploying to Kubernetes, build the Docker images:

```zsh
# Build backend image
docker build -t team7-backend:latest ./server

# Build frontend image
docker build -t team7-frontend:latest ./web

# Alternatively use the provided docker compose configuration
docker compose up --build
```

## Deployment

Use the provided deploy.sh script
```zsh
chmod +x ./deploy.sh
./deploy.sh
```

### Option 2: Manual kubectl apply

```zsh
# Create namespace
kubectl apply -f namespace.yaml

# Create deployments and services
kubectl apply -f .

# Forward ports (needs 2 separate terminal windows)
# Frontend port forwarding
kubectl port-forward service/frontend 5173:5173 -n team7
# Backend port forwarding
kubectl port-forward service/backend 8000:80 -n team7
```

## Cleanup

```zsh
# Delete all resources in team7 namespace
kubectl delete namespace team7

# Or delete specific resources
kubectl delete -k .
```




