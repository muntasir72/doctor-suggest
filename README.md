# MediMatch

AI-powered symptom analysis and doctor recommendation app.

Describe your symptoms in plain language and the app will identify the right medical specialist, find matching doctors, and provide relevant medical context — all in seconds.

---

## How It Works

```
                          +------------------+
                          |  React Frontend  |
                          +--------+---------+
                                   |
                                   v
                          +------------------+
                          |  FastAPI Backend  |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |              |              |
                    v              v              v
              +-----------+  +-----------+  +-----------+
              |  OpenAI   |  |  Exa AI   |  | Doctor DB |
              | (extract  |  | (medical  |  | (filter   |
              | symptoms) |  |  context) |  |  matches) |
              +-----+-----+  +-----+-----+  +-----------+
                    |              |              ^
                    v              v              |
              +-----------+                      |
              |  OpenAI   |  --------------------+
              | (decide   |
              | specialist|
              +-----------+
```

**Step-by-step:**

1. User describes symptoms in the React frontend
2. Backend sends the text to **OpenAI** to extract structured symptoms
3. **Exa AI** searches for relevant medical context
4. **OpenAI** determines the appropriate medical specialist
5. **Doctor DB** filters matching doctors by specialty
6. Results are returned to the frontend

---

## Prerequisites

| Requirement  | Minimum Version |
|-------------|----------------|
| Python      | 3.10+          |
| Node.js     | 18+            |
| OpenAI API key | [Get one here](https://platform.openai.com/api-keys) |
| Exa AI API key | [Get one here](https://exa.ai) |

---

## Getting Started

### Backend

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux
```

Open the `.env` file and add your API keys:

```
OPENAI_API_KEY=sk-...
EXA_API_KEY=...
```

Start the server:

```bash
python run.py
```

Backend will be running at **http://localhost:8000**

---

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the development server
npm start
```

Frontend will be running at **http://localhost:3000**

---

## API Reference

### `POST /analyze` — Analyze Symptoms

Send a plain-text description of symptoms and receive a specialist recommendation with matching doctors.

**Request**

```json
{
  "symptoms": "I have been experiencing severe headaches for the past week, along with dizziness and blurred vision"
}
```

**Response**

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
  "disclaimer": "This is not medical advice. Please consult a qualified doctor for proper diagnosis and treatment.",
  "emergency": false,
  "emergency_message": null
}
```

---

### `POST /analyze` — Emergency Detection

The app automatically detects life-threatening symptoms and responds with an emergency alert.

**Request**

```json
{
  "symptoms": "I have chest pain and breathing difficulty"
}
```

**Response**

```json
{
  "specialist": "emergency medicine",
  "doctors": [],
  "medical_context": "",
  "extracted_symptoms": [],
  "disclaimer": "This is not medical advice. Please consult a qualified doctor for proper diagnosis and treatment.",
  "emergency": true,
  "emergency_message": "EMERGENCY: Your symptoms suggest a potentially life-threatening condition. Please call emergency services (911) immediately or go to the nearest emergency room."
}
```

---

### `GET /health` — Health Check

Returns server status. Use for uptime monitoring.

```json
{ "status": "ok" }
```

---

## Tech Stack

| Layer    | Technology       |
|----------|-----------------|
| Frontend | React 18         |
| Backend  | FastAPI          |
| AI       | OpenAI gpt-4.1-mini |
| Search   | Exa AI           |
| Database | In-memory list   |

---

## Project Structure

```
Health_App/
├── backend/
│   ├── .env.example       # Environment variable template
│   ├── requirements.txt   # Python dependencies
│   └── run.py             # Entry point for the FastAPI server
├── frontend/
│   ├── package.json       # Node.js dependencies
│   └── src/               # React application source
└── README.md
```

---

## Disclaimer

> This application is for **informational purposes only** and does **not** provide medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.
