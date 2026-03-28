# Healthcare Assistant

AI-powered symptom analysis and doctor recommendation app using OpenAI and Exa AI.

## Architecture

```
User → React Frontend → FastAPI Backend → OpenAI (extract symptoms)
                                        → Exa AI  (medical context search)
                                        → OpenAI (decide specialist)
                                        → Doctor DB (filter matches)
                                        → Response
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key
- Exa AI API key

## Setup & Run

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API keys
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Edit .env and add your actual API keys
# OPENAI_API_KEY=sk-...
# EXA_API_KEY=...

# Run the server
python run.py
```

The backend runs at **http://localhost:8000**.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend runs at **http://localhost:3000**.

## API Usage

### `POST /analyze`

**Request:**

```json
{
  "symptoms": "I have been experiencing severe headaches for the past week, along with dizziness and blurred vision"
}
```

**Response:**

```json
{
  "specialist": "neurologist",
  "doctors": [
    {
      "name": "Dr. Priya Sharma",
      "specialty": "neurologist",
      "hospital": "NeuroLife Clinic",
      "phone": "+1-555-0201"
    },
    {
      "name": "Dr. Robert Kim",
      "specialty": "neurologist",
      "hospital": "City General Hospital",
      "phone": "+1-555-0202"
    }
  ],
  "medical_context": "...relevant medical information from Exa AI...",
  "extracted_symptoms": ["severe headaches", "dizziness", "blurred vision"],
  "disclaimer": "⚠️ This is not medical advice. Please consult a qualified doctor for proper diagnosis and treatment.",
  "emergency": false,
  "emergency_message": null
}
```

### Emergency Example

**Request:**

```json
{
  "symptoms": "I have chest pain and breathing difficulty"
}
```

**Response:**

```json
{
  "specialist": "emergency medicine",
  "doctors": [],
  "medical_context": "",
  "extracted_symptoms": [],
  "disclaimer": "⚠️ This is not medical advice. Please consult a qualified doctor for proper diagnosis and treatment.",
  "emergency": true,
  "emergency_message": "🚨 EMERGENCY: Your symptoms suggest a potentially life-threatening condition. Please call emergency services (911) immediately or go to the nearest emergency room. Do NOT wait for a scheduled appointment."
}
```

### `GET /health`

Returns `{"status": "ok"}` — use for health checks.

## Tech Stack

| Layer    | Technology     |
| -------- | -------------- |
| Frontend | React 18       |
| Backend  | FastAPI        |
| AI       | OpenAI gpt-4.1-mini |
| Search   | Exa AI         |
| Database | In-memory list |
