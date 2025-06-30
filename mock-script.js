let answersSummary = [];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("mock-form");
  const questionBox = document.getElementById("questionBox");
  const userAnswer = document.getElementById("userAnswer");
  const feedbackBox = document.getElementById("feedbackBox");
  const nextBtn = document.getElementById("nextQuestionBtn");
  const submitBtn = document.getElementById("submitAnswerBtn");
  const finishBtn = document.getElementById("finishInterviewBtn");
  const downloadBtnSection = document.getElementById("downloadButtons");
  const interviewSection = document.querySelector(".interview-container");
  const resumeInput = document.getElementById("mockResume");
  const resumeLabel = document.getElementById("resumeLabel");
  const loader = document.getElementById("button-loader");

  let currentIndex = 0;
  let questions = [];

  function showLoader() {
    loader.style.display = "grid";
  }

  function hideLoader() {
    loader.style.display = "none";
  }

  function showQuestion(index) {
    const current = questions[index];
    if (!current || !current.question) return;

    questionBox.innerText = current.question;
    userAnswer.value = "";
    feedbackBox.innerHTML = "";
    userAnswer.style.display = "block";
    submitBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    finishBtn.style.display = "none";
    downloadBtnSection.style.display = "none";
    questionBox.scrollIntoView({ behavior: "smooth" });
  }

  resumeInput.addEventListener("change", () => {
    const file = resumeInput.files[0];
    if (file && file.type === "application/pdf") {
      resumeLabel.innerText = file.name;
    } else {
      alert("Only PDF files are allowed.");
      resumeInput.value = "";
      resumeLabel.innerText = "Resume is required to begin.";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const jobTitle = document.getElementById("mockJobTitle").value;
    const experience = document.getElementById("mockExperience").value;
    const resumeFile = resumeInput.files[0];

    if (!resumeFile) return alert("Please upload your resume (PDF only).");

    const formData = new FormData();
    formData.append("jobTitle", jobTitle);
    formData.append("experience", experience);
    formData.append("questionType", "All");
    formData.append("resume", resumeFile);

    showLoader();

    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      questions = [
        ...(data["Technical Skills"] || []),
        ...(data["Problem Solving"] || []),
        ...(data["Teamwork & Collaboration"] || []),
      ];

      if (questions.length > 0) {
        currentIndex = 0;
        showQuestion(currentIndex);
        interviewSection.style.display = "block";
        form.style.display = "none";
      } else {
        alert("No questions generated. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    } finally {
      hideLoader();
    }
  });

  submitBtn.addEventListener("click", async () => {
    const answer = userAnswer.value.trim();
    if (!answer) return alert("Please enter your answer.");

    const question = questions[currentIndex].question;
    const rawQ = question;
    const lines = rawQ.split("\n");
    const situationLine = lines.find(line => line.toLowerCase().includes("situation:"));
    const questionText = situationLine ? situationLine.replace(/[*]/g, "").replace(/situation:/i, "").trim() : rawQ;

    showLoader();

    try {
      const res = await fetch("http://localhost:5000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      if (!res.ok) throw new Error("Feedback fetch failed");

      const data = await res.json();
      const feedback = data.feedback || "No feedback received.";
      const sampleAnswer = data.sample_answer || "";

      feedbackBox.innerHTML = `
        <div class="summary-card">
          <h3 class="summary-question">Q${currentIndex + 1}: ${questionText}</h3>
          <div class="summary-answer-block">
            <p><span class="label">Your Answer:</span><br>${answer}</p>
            <p><span class="label">📝 Feedback:</span><br>${feedback}</p>
            <p><span class="label">✅ Sample Answer:</span><br>${sampleAnswer}</p>
          </div>
        </div>
      `;

      answersSummary.push({
        question: questionText,
        answer,
        feedback,
        sample: sampleAnswer
      });

      submitBtn.style.display = "none";
      userAnswer.style.display = "none";
      nextBtn.style.display = (currentIndex < questions.length - 1) ? "inline-block" : "none";
      finishBtn.style.display = "inline-block";
    } catch (err) {
      console.error(err);
      alert("Failed to get feedback.");
    } finally {
      hideLoader();
    }
  });

  nextBtn.addEventListener("click", () => {
    currentIndex++;
    if (currentIndex < questions.length) {
      showQuestion(currentIndex);
    } else {
      nextBtn.style.display = "none";
    }
  });

  finishBtn.addEventListener("click", () => {
    questionBox.innerText = "🎉 Interview Complete! Summary Below:";
    userAnswer.style.display = "none";
    submitBtn.style.display = "none";
    nextBtn.style.display = "none";
    finishBtn.style.display = "none";

    let summaryHTML = "<ul>";
    answersSummary.forEach((item, index) => {
      summaryHTML += `
        <li style="margin-bottom: 20px;">
          <strong style="color: #7b61ff;">Q${index + 1}: ${item.question}</strong><br/><br/>
          <div><strong style="color:#fff;">Your Answer:</strong><br/>${item.answer}</div><br/>
          <div><strong style="color:#fbb03b;">📝 Feedback:</strong><br/>${item.feedback}</div><br/>
          <div><strong style="color:#ffc107;">✅ Sample Answer:</strong><br/>${item.sample}</div>
        </li>`;
    });
    summaryHTML += "</ul>";

    feedbackBox.innerHTML = summaryHTML;
    downloadBtnSection.style.display = "block";
  });

  // Download handlers
  window.downloadText = () => {
    let content = "Mock Interview Summary:\n\n";
    answersSummary.forEach((item, index) => {
      content += `Q${index + 1}: ${item.question}\nYour Answer: ${item.answer}\nFeedback: ${item.feedback}\nSample Answer: ${item.sample}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "interview_summary.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.downloadPDF = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 15;
  const lineHeight = 7;
  const maxWidth = doc.internal.pageSize.width - margin * 2;
  const pageHeight = doc.internal.pageSize.height;
  let y = margin;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0); // Black title
  doc.text("✨ Mock Interview Summary ✨", margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  answersSummary.forEach((item, index) => {
    const blocks = [
      { label: `Q${index + 1}: ${item.question}`, color: [50, 50, 150] },
      { label: "Your Answer:", color: [0, 0, 0] },
      { label: item.answer, color: [0, 0, 0] },
      { label: "📝 Feedback:", color: [180, 100, 0] },
      { label: item.feedback, color: [0, 0, 0] },
      { label: "✅ Sample Answer:", color: [0, 120, 0] },
      { label: item.sample, color: [0, 0, 0] }
    ];

    for (let i = 0; i < blocks.length; i++) {
      const { label, color } = blocks[i];
      const textLines = doc.splitTextToSize(label, maxWidth);
      const blockHeight = textLines.length * lineHeight;

      if (y + blockHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setTextColor(...color);
      doc.text(textLines, margin, y);
      y += blockHeight + 2; // Add extra spacing between sections
    }

    doc.setDrawColor(200);
    doc.line(margin, y, margin + maxWidth, y);
    y += 6; // space after line separator
  });

  doc.save("interview_summary.pdf");
};

});
