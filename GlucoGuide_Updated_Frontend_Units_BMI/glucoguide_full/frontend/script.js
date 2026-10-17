const form = document.getElementById("prediction-form");
const formMessage = document.getElementById("form-message");
const submitButton = document.getElementById("submit-btn");
const resultSection = document.getElementById("result-section");
const bmiModal = document.getElementById("bmi-modal");
const bmiPreview = document.getElementById("bmi-preview");
const toast = document.getElementById("toast");
let calculatedBMI = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function openBmiModal() {
  bmiModal.classList.remove("hidden");
  bmiPreview.classList.add("hidden");
  document.getElementById("height").focus();
}
function closeBmiModal() {
  bmiModal.classList.add("hidden");
}
document.getElementById("open-bmi").addEventListener("click", openBmiModal);
document.getElementById("close-bmi").addEventListener("click", closeBmiModal);
bmiModal.addEventListener("click", (event) => {
  if (event.target === bmiModal) closeBmiModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeBmiModal();
});

function calculateBMI() {
  const heightCm = Number(document.getElementById("height").value);
  const weightKg = Number(document.getElementById("weight").value);
  if (!heightCm || !weightKg || heightCm < 50 || heightCm > 250 || weightKg < 10 || weightKg > 500) {
    bmiPreview.textContent = "Enter a height between 50–250 cm and weight between 10–500 kg.";
    bmiPreview.classList.remove("hidden");
    calculatedBMI = null;
    return;
  }
  calculatedBMI = Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
  bmiPreview.textContent = `Calculated BMI: ${calculatedBMI} kg/m²`;
  bmiPreview.classList.remove("hidden");
}
document.getElementById("calculate-bmi").addEventListener("click", calculateBMI);
document.getElementById("use-bmi").addEventListener("click", () => {
  if (calculatedBMI === null) calculateBMI();
  if (calculatedBMI === null) return;
  document.getElementById("BMI").value = calculatedBMI;
  closeBmiModal();
  showToast("BMI added to the form.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const data = {};
  const numericFields = [
    ["Pregnancies", true],
    ["Glucose", false],
    ["BloodPressure", false],
    ["SkinThickness", false],
    ["Insulin", false],
    ["BMI", false],
    ["DiabetesPedigreeFunction", false],
    ["Age", true]
  ];
  for (const [name, isInteger] of numericFields) {
    const input = document.getElementById(name);
    if (input.value.trim() === "") {
      formMessage.textContent = `Please enter ${name}. All eight model features are required.`;
      input.focus();
      return;
    }
    const value = Number(input.value);
    if (!Number.isFinite(value)) {
      formMessage.textContent = `Please enter a valid number for ${name}.`;
      input.focus();
      return;
    }
    if (isInteger && !Number.isInteger(value)) {
      formMessage.textContent = `${name} must be a whole number.`;
      input.focus();
      return;
    }
    data[name] = value;
  }

  submitButton.disabled = true;
  submitButton.innerHTML = 'Running Random Forest… <span>⟳</span>';
  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.detail || "Prediction request failed. Check that the backend is running.");
    }
    showResult(result);
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    formMessage.textContent = `${error.message} Make sure you opened the website at http://127.0.0.1:8000 rather than by double-clicking index.html.`;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Get model result <span>→</span>';
  }
});

function showResult(result) {
  const positive = Number(result.prediction) === 1;
  const status = document.getElementById("result-status");
  status.classList.toggle("positive", positive);
  document.getElementById("status-label").textContent = positive
    ? "Model classified this example as class 1"
    : "Model classified this example as class 0";
  document.getElementById("class-number").textContent = String(result.prediction);
  const probability = typeof result.probability === "number" ? result.probability : null;
  const percent = probability === null ? null : Math.round(probability * 100);
  document.getElementById("probability-number").textContent = percent === null ? "N/A" : `${percent}%`;
  document.getElementById("meter-fill").style.width = `${percent === null ? 0 : percent}%`;
  document.getElementById("meter-fill").style.background = positive ? "#d78a62" : "#4ab991";
  document.getElementById("score-ring").style.background = `conic-gradient(${positive ? "#d78a62" : "#4ab991"} ${percent === null ? 0 : percent * 3.6}deg, #e8eff0 0deg)`;
  document.getElementById("result-explainer").textContent = probability === null
    ? "The model returned a class label. This model does not provide a probability for this output."
    : `The saved Random Forest returned class ${result.prediction}. Its estimated probability for class 1 on this input is ${percent}%. This is a model output, not a calibrated personal health risk.`;
}

document.getElementById("edit-btn").addEventListener("click", () => {
  resultSection.classList.add("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

fetch("/api/health")
  .then((response) => {
    if (!response.ok) throw new Error("API health check failed");
    return response.json();
  })
  .then((health) => {
    if (health.model !== "Random Forest") showToast("Connected to prediction API.");
  })
  .catch(() => {
    formMessage.textContent = "The page loaded, but the prediction API is not reachable. Start the backend using the README instructions.";
  });
