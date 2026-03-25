#!/bin/bash

kubectl apply -f namespace.yaml

kubectl apply -f .

sleep 2
# Waiting for pods to start, ensures that the script will work without running multiple times
kubectl wait --for=condition=Ready pod -l app=backend -n team7 --timeout=30s
kubectl wait --for=condition=Ready pod -l app=frontend -n team7 --timeout=30s

echo "Starting Port Forwarding..."
kubectl port-forward service/frontend 5173:5173 -n team7 &
PID_FRONTEND=$!

kubectl port-forward service/backend 8000:80 -n team7 &
PID_BACKEND=$!


# Cleanup function
trap "kill $PID_FRONTEND $PID_BACKEND" EXIT

# Keep script running
wait