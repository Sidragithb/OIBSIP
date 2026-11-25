// =============================================================
// Calculator — vanilla JavaScript (no eval)
// The expression is stored as a list of tokens, for example
//   ["5", "+", "3", "×"]  plus the number being typed: "2"
// When "=" is pressed the tokens are evaluated with normal maths
// precedence (× and ÷ before + and −), so 5 + 3 × 2 = 11.
// =============================================================

const expressionEl = document.getElementById("expression");
const currentEl = document.getElementById("current");
const keys = document.querySelectorAll(".key");

const MAX_DIGITS = 15;

// ----- Calculator state -----
let tokens = [];            // finished numbers and operators
let current = "";           // the number currently being typed
let lastExpression = "";    // shown above the result after "="
let justEvaluated = false;  // true right after "=" was pressed
let errorMessage = "";      // e.g. "Cannot divide by zero"

// ----- Input handlers -----

function clearAll() {
  tokens = [];
  current = "";
  lastExpression = "";
  justEvaluated = false;
  errorMessage = "";
}

function inputDigit(digit) {
  if (errorMessage) clearAll();

  // Typing a digit after "=" starts a brand new calculation
  if (justEvaluated) {
    clearAll();
  }

  const digitCount = current.replace(/[^0-9]/g, "").length;
  if (digitCount >= MAX_DIGITS) return;

  if (current === "0") {
    current = digit;          // replace a leading zero
  } else if (current === "-0") {
    current = "-" + digit;
  } else {
    current += digit;
  }
}

function inputDecimal() {
  if (errorMessage) clearAll();
  if (justEvaluated) clearAll();

  if (current === "" || current === "-") {
    current += "0.";
  } else if (!current.includes(".")) {
    current += ".";
  }
}

function inputOperator(operator) {
  if (errorMessage) clearAll();

  // Chaining: keep calculating from the previous result
  if (justEvaluated) {
    tokens = [current];
    current = "";
    justEvaluated = false;
    tokens.push(operator);
    return;
  }

  if (current === "" || current === "-") {
    if (tokens.length === 0) {
      tokens = ["0", operator];                 // operator pressed first
    } else {
      tokens[tokens.length - 1] = operator;     // swap the last operator
    }
    current = "";
    return;
  }

  tokens.push(cleanNumber(current), operator);
  current = "";
}

function toggleSign() {
  if (errorMessage) return;

  if (justEvaluated) {
    // Allow editing the result, e.g. 8 → -8, then keep going
    justEvaluated = false;
    lastExpression = "";
  }

  if (current === "" || current === "0") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
}

function backspace() {
  if (errorMessage) {
    clearAll();
    return;
  }

  if (justEvaluated) {
    // Keep the result on screen but make it editable
    justEvaluated = false;
    lastExpression = "";
  }

  if (current !== "") {
    current = current.slice(0, -1);
    if (current === "-") current = "";
  } else if (tokens.length > 0) {
    // Remove the last operator and bring the previous number back
    tokens.pop();
    current = tokens.pop() || "";
  }
}

function equals() {
  if (errorMessage || justEvaluated) return;

  const list = [...tokens];
  if (current !== "" && current !== "-") {
    list.push(cleanNumber(current));
  } else if (list.length > 0) {
    list.pop();                                  // drop a trailing operator
  }
  if (list.length === 0) return;

  try {
    const result = evaluate(list);
    lastExpression = list.map(formatToken).join(" ") + " =";
    current = formatNumber(result);
    tokens = [];
    justEvaluated = true;
  } catch (error) {
    clearAll();
    errorMessage = error.message;
  }
}

// ----- Maths -----

// Evaluates a token list like ["5", "+", "3", "×", "2"].
// Pass 1 applies × and ÷ immediately; + and − numbers are put on a stack.
// Pass 2 adds up the stack. This respects operator precedence without eval().
function evaluate(list) {
  const stack = [parseFloat(list[0])];

  for (let i = 1; i < list.length; i += 2) {
    const operator = list[i];
    const number = parseFloat(list[i + 1]);
    const last = stack.length - 1;

    switch (operator) {
      case "×":
        stack[last] = stack[last] * number;
        break;
      case "÷":
        if (number === 0) {
          throw new Error("Cannot divide by zero");
        }
        stack[last] = stack[last] / number;
        break;
      case "−":
        stack.push(-number);
        break;
      case "+":
        stack.push(number);
        break;
      default:
        throw new Error("Unknown operator");
    }
  }

  const total = stack.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total)) {
    throw new Error("Result is too large");
  }
  return total;
}

// Removes floating-point noise: 0.1 + 0.2 shows 0.3, not 0.30000000000000004
function formatNumber(value) {
  const rounded = parseFloat(value.toPrecision(12));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

// "12." → "12", "-0" → "0"
function cleanNumber(text) {
  return formatNumber(parseFloat(text));
}

// Negative numbers are wrapped in brackets in the expression line: 5 × (-3)
function formatToken(token) {
  return token.startsWith("-") ? `(${token})` : token;
}

// ----- Display -----

function updateDisplay() {
  if (errorMessage) {
    expressionEl.textContent = "";
    currentEl.textContent = errorMessage;
    currentEl.className = "current error";
    return;
  }

  expressionEl.textContent = justEvaluated
    ? lastExpression
    : tokens.map(formatToken).join(" ");

  // While waiting for the next number, keep showing the previous one
  let shown = current;
  if (shown === "") {
    shown = tokens.length >= 2 ? tokens[tokens.length - 2] : "0";
  }

  currentEl.textContent = shown;
  currentEl.className = shown.length > 11 ? "current small" : "current";
}

// ----- Event listeners (one per button, no inline onclick) -----

function handleButton(button) {
  const { digit, operator, action } = button.dataset;

  if (digit !== undefined) {
    inputDigit(digit);
  } else if (operator !== undefined) {
    inputOperator(operator);
  } else {
    switch (action) {
      case "decimal":
        inputDecimal();
        break;
      case "clear":
        clearAll();
        break;
      case "backspace":
        backspace();
        break;
      case "sign":
        toggleSign();
        break;
      case "equals":
        equals();
        break;
    }
  }

  updateDisplay();
}

keys.forEach((button) => {
  button.addEventListener("click", () => handleButton(button));
});

// ----- Keyboard support (bonus) -----

const keyboardMap = {
  "+": '[data-operator="+"]',
  "-": '[data-operator="−"]',
  "*": '[data-operator="×"]',
  "x": '[data-operator="×"]',
  "/": '[data-operator="÷"]',
  ".": '[data-action="decimal"]',
  ",": '[data-action="decimal"]',
  "Enter": '[data-action="equals"]',
  "=": '[data-action="equals"]',
  "Backspace": '[data-action="backspace"]',
  "Escape": '[data-action="clear"]',
  "Delete": '[data-action="clear"]',
};

document.addEventListener("keydown", (event) => {
  const selector = /^[0-9]$/.test(event.key)
    ? `[data-digit="${event.key}"]`
    : keyboardMap[event.key];
  if (!selector) return;

  event.preventDefault();
  const button = document.querySelector(selector);
  handleButton(button);

  // Brief visual feedback on the matching button
  button.classList.add("pressed");
  setTimeout(() => button.classList.remove("pressed"), 100);
});

updateDisplay();
