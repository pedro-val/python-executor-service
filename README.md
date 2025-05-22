# Python Executor Service

A secure service that executes arbitrary Python code in a sandboxed environment using nsjail.

## Features

- Node.js API service built with Express
- Executes Python code securely in a sandboxed environment using nsjail
- Returns both the result of the main() function and captured stdout
- Supports basic libraries like os, pandas, and numpy
- Input validation ensures the script has a main() function and returns JSON
- Docker-based deployment for easy setup and portability

## Quick Start

### Running locally with Docker

```bash
# Build the Docker image
docker build -t python-executor-service .

# Run the service
docker run -p 8080:8080 python-executor-service
```

### Testing the service

You can test the service with the following curl command:

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "import pandas as pd\n\ndef main():\n    print(\"Hello, World!\")\n    df = pd.DataFrame({\"A\": [1, 2, 3], \"B\": [4, 5, 6]})\n    print(df)\n    return {\"message\": \"Success\", \"data\": df.to_dict()}"
  }'
```

## API Reference

### POST /execute

Executes a Python script and returns the result of the main() function along with any captured stdout.

#### Request Body

```json
{
  "script": "def main():\n    return {\"message\": \"Hello, World!\"}"
}
```

The script must contain a `main()` function that returns a JSON-serializable object.

#### Response

```json
{
  "result": {
    "message": "Hello, World!"
  },
  "stdout": ""
}
```

- `result`: The return value of the main() function (must be JSON-serializable)
- `stdout`: The captured stdout of the script execution

### GET /health

Returns the status of the service.

## Deployment

### Google Cloud Run

1. Build and push the Docker image to Google Container Registry:

```bash
# Set your Google Cloud project ID
export PROJECT_ID=your-project-id

# Build and tag the image
docker build -t gcr.io/$PROJECT_ID/python-executor-service .

# Push the image to Google Container Registry
docker push gcr.io/$PROJECT_ID/python-executor-service

# Deploy to Cloud Run
gcloud run deploy python-executor-service \
  --image gcr.io/$PROJECT_ID/python-executor-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

2. Once deployed, you can test the service with:

```bash
# Replace CLOUD_RUN_URL with your deployed service URL
curl -X POST https://CLOUD_RUN_URL/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "def main():\n    return {\"message\": \"Hello from Cloud Run!\"}"
  }'
```

## Security Considerations

- The service uses nsjail to create a secure sandbox environment
- Process isolation prevents malicious code from accessing the host system
- Resource limits are enforced (CPU, memory, file size, etc.)
- Network isolation restricts outbound connections
- Filesystem is read-only except for temporary directories

## Limitations

- Execution time is limited to 30 seconds
- Memory usage is restricted
- Network access is disabled
- Only Python standard library and specified packages (pandas, numpy) are available

## Example Requests

### Simple Example
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "def main():\n    return {\"message\": \"Hello, World!\"}"
  }'
```

### Using NumPy
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "import numpy as np\n\ndef main():\n    arr = np.array([1, 2, 3, 4, 5])\n    mean = float(np.mean(arr))\n    std = float(np.std(arr))\n    return {\"mean\": mean, \"std\": std, \"original_data\": arr.tolist()}"
  }'
```

### Using Pandas
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "import pandas as pd\n\ndef main():\n    data = [[1, 2], [3, 4]]\n    df = pd.DataFrame(data, columns=[\"A\", \"B\"])\n    print(\"DataFrame created:\")\n    print(df)\n    return {\"data\": df.to_dict()}"
  }'
```

## Google Cloud CLI Instructions

1. Fazer login no Google Cloud

```bash
gcloud auth login
```

2. Configurar o projeto

```bash
gcloud config set project python-executor-service
```

3. Habilitar as APIs necessárias

```bash
gcloud services enable run.googleapis.com containerregistry.googleapis.com
``` 