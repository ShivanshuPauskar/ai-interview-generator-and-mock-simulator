document.getElementById("job-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const jobTitle = document.getElementById("jobTitle").value.trim();
  const experience = document.getElementById("experience").value;
  const questionType = document.getElementById("questionType").value;
  const resumeFile = document.getElementById("resume").files[0];

  const buttonText = document.getElementById("btnText");
  const loader = document.getElementById("button-loader");

  buttonText.querySelector("span").textContent = "Generating...";
  loader.style.display = "inline-grid";

  const sections = {
    "Technical Skills": document.getElementById("technicalSection"),
    "Problem Solving": document.getElementById("problemSection"),
    "Teamwork & Collaboration": document.getElementById("teamworkSection"),
  };

  for (const key in sections) {
    sections[key].style.display = "none";
    sections[key].querySelector("ul").innerHTML = "";
  }

  try {
    const formData = new FormData();
    formData.append("jobTitle", jobTitle);
    formData.append("experience", experience);
    formData.append("questionType", questionType);
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }

    const response = await fetch("http://localhost:5000/generate", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    const selectedCategories = questionType === "All"
      ? ["Technical Skills", "Problem Solving", "Teamwork & Collaboration"]
      : [questionType];

    selectedCategories.forEach((category) => {
      const section = sections[category];
      const list = section.querySelector("ul");
      const questions = data[category];

      if (questions && questions.length > 0) {
        section.style.display = "block";
        questions.forEach((qa, index) => {
          const li = document.createElement("li");
          li.innerHTML = `
            <strong>Q${index + 1}:</strong> ${qa.question}
            <br>
            <button class="toggle-answer">Show Answer</button>
            <div class="answer" style="display: none;">Answer: ${qa.answer}</div>
          `;
          list.appendChild(li);
        });
      }
    });

    document.querySelectorAll(".toggle-answer").forEach((btn) => {
      btn.addEventListener("click", () => {
        const answerDiv = btn.nextElementSibling;
        const isHidden = answerDiv.style.display === "none";
        answerDiv.style.display = isHidden ? "block" : "none";
        btn.textContent = isHidden ? "Hide Answer" : "Show Answer";
      });
    });

    buttonText.querySelector("span").textContent = "Regenerate";
  } catch (err) {
    console.error("❌ Error fetching questions:", err);
    const selectedCategories = questionType === "All"
      ? ["Technical Skills", "Problem Solving", "Teamwork & Collaboration"]
      : [questionType];

    selectedCategories.forEach((category) => {
      const section = sections[category];
      section.querySelector("ul").innerHTML = "<li>Error generating questions. Try again later.</li>";
      section.style.display = "block";
      section.classList.remove("fade-in"); // Reset animation
      void section.offsetWidth;            // Reflow hack to re-trigger
      section.classList.add("fade-in");

    });

    buttonText.querySelector("span").textContent = "Try Again";
  }

  loader.style.display = "none";
});

document.getElementById("resumeUploadBtn").addEventListener("click", () => {
  document.getElementById("resume").click();
});

document.getElementById("resume").addEventListener("change", function () {
  const fileDisplay = document.getElementById("fileNameDisplay");
  if (this.files && this.files.length > 0) {
    fileDisplay.textContent = this.files[0].name;
  } else {
    fileDisplay.textContent = "Upload a resume (PDF) for personalized questions";
  }
});
