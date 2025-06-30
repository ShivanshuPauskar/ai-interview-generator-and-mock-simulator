from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import fitz  # PyMuPDF
import google.generativeai as genai
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")


def extract_text_from_resume(resume_file):
    doc = fitz.open(stream=resume_file.read(), filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def parse_questions_answers(text):
    pattern = re.compile(
        r"\*\*Question\s*\d*\*?:\*\*\s*(.*?)\s*\*\*Sample Answer:\*\*\s*(.*?)(?=\*\*Question|\Z)",
        re.DOTALL | re.IGNORECASE
    )

    matches = pattern.findall(text)
    qa_pairs = []

    for question, answer in matches:
        cleaned_q = re.sub(r"\s+", " ", question.strip())
        cleaned_a = re.sub(r"\s+", " ", answer.strip())
        qa_pairs.append({
            "question": cleaned_q,
            "answer": cleaned_a
        })

    print(f"🧠 Robust parser extracted {len(qa_pairs)} Q&A pairs.")
    return qa_pairs


@app.route("/generate", methods=["POST"])
def generate_questions():
    try:
        job_title = request.form.get("jobTitle", "")
        experience = request.form.get("experience", "")
        question_type = request.form.get("questionType", "")
        resume_file = request.files.get("resume", None)

        print(f"🔍 Request received for: {job_title} - {experience} - {question_type}")

        resume_text = extract_text_from_resume(resume_file) if resume_file else ""

        categories = ["Technical Skills", "Problem Solving", "Teamwork & Collaboration"]
        selected = categories if question_type == "All" else [question_type]
        result = {}

        for cat in categories:
            if cat not in selected:
                result[cat] = []
                continue

            prompt = (
                f"You are an AI interview assistant. Generate 5 {cat} interview questions "
                f"for a candidate applying as a {experience} {job_title}."
            )
            if resume_text:
                prompt += f"\nResume:\n{resume_text}"

            prompt += "\nInclude a sample answer for each question."

            response = model.generate_content(prompt)
            content = response.text.strip()

            print(f"\n📥 Gemini Raw Response for {cat}:\n{content[:300]}...\n")
            qa = parse_questions_answers(content)
            print(f"✅ Extracted {len(qa)} Q&A pairs for {cat}\n")

            result[cat] = qa

        return jsonify(result)

    except Exception as e:
        print("❌ Error generating questions:", e)
        return jsonify({"error": "Failed to generate questions"}), 500


@app.route("/feedback", methods=["POST"])
def generate_feedback():
    try:
        data = request.get_json()
        question = data.get("question", "")
        answer = data.get("answer", "")

        prompt = (
            f"Interview Question: {question}\n"
            f"Candidate's Answer: {answer}\n\n"
            "Please provide critical feedback and suggest a strong sample answer."
        )

        response = model.generate_content(prompt)
        content = response.text.strip()

        feedback_text = ""
        sample_answer = ""

        if "Sample Answer:" in content:
            parts = content.split("Sample Answer:", 1)
            feedback_text = parts[0].strip()
            sample_answer = "Sample Answer:" + parts[1].strip()
        else:
            feedback_text = content

        return jsonify({
            "feedback": feedback_text,
            "sample_answer": sample_answer
        })

    except Exception as e:
        print("❌ Feedback Error:", e)
        return jsonify({"error": "Failed to generate feedback"}), 500


if __name__ == "__main__":
    app.run(debug=True)
