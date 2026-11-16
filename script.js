// ==========================================
// STUDENT CLASS
// ==========================================

class Student {
  constructor(id, name, score) {
    this.id = id;
    this.name = name;
    this.score = score;
    this.attendance = {};
    this.dropped = false;
    this.droppedAt = null;
  }

  getStatus(date) {
    const record = this.attendance[date];

    return typeof record === "string"
      ? record
      : record?.status || "";
  }

  getReason(date) {
    const record = this.attendance[date];

    return typeof record === "object"
      ? record?.reason || ""
      : "";
  }

  getPresentCount() {
    return Object.keys(this.attendance).filter(
      date => this.getStatus(date) === "Present"
    ).length;
  }

  getAbsentCount() {
    return Object.keys(this.attendance).filter(
      date => this.getStatus(date) === "Absent"
    ).length;
  }

  getExcusedCount() {
    return Object.keys(this.attendance).filter(
      date => this.getStatus(date) === "Excused"
    ).length;
  }

  getAttendancePercentage() {
    const total = this.getPresentCount() + this.getAbsentCount();

    if (total === 0) return 0;

    return Math.round((this.getPresentCount() / total) * 100);
  }

  isDroppedOnDate(date) {
    return this.dropped &&
      (!this.droppedAt || date >= this.droppedAt);
  }
}


// ==========================================
// STUDENT LIST
// ==========================================

class StudentList {
  constructor() {
    this.students = [];
    this.nextId = 1;
  }

  addStudent(name, score) {
    const student = new Student(this.nextId++, name, score);
    this.students.push(student);
    return student;
  }

  getAllStudents() {
    return this.students;
  }

  findByName(name) {
    return this.students.find(
      student => student.name.toLowerCase() === name.toLowerCase()
    );
  }
}


// ==========================================
// ALPHABETICAL SORTING
// ==========================================

function sortAlphabetically(students) {
  return [...students].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      sensitivity: "base"
    })
  );
}


// ==========================================
// STORAGE
// ==========================================

const STORAGE_KEY = "studentAttendanceRankingData";

const list = new StudentList();

let searchResults = null;

function saveData() {
  const data = {
    nextId: list.nextId,

    students: list.students.map(student => ({
      id: student.id,
      name: student.name,
      score: student.score,
      attendance: student.attendance,
      dropped: student.dropped,
      droppedAt: student.droppedAt
    }))
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Unable to save data:", error);
    alert("Unable to save data. Check your browser storage settings.");
  }
}

function loadData() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) return;

    const data = JSON.parse(savedData);

    if (!data || !Array.isArray(data.students)) return;

    list.students = data.students.map(item => {
      const student = new Student(
        Number(item.id),
        String(item.name),
        Number(item.score)
      );

      student.attendance = item.attendance || {};
      student.dropped = item.dropped === true;
      student.droppedAt = item.droppedAt || null;

      return student;
    });

    const highestId = list.students.reduce(
      (max, student) => Math.max(max, student.id),
      0
    );

    list.nextId = Math.max(
      Number(data.nextId) || 1,
      highestId + 1
    );

  } catch (error) {
    console.error("Unable to load saved data:", error);
  }
}

loadData();


// ==========================================
// HTML ELEMENTS
// ==========================================

const studentForm = document.getElementById("studentForm");
const studentName = document.getElementById("studentName");
const studentScore = document.getElementById("studentScore");
const registerMessage = document.getElementById("registerMessage");

const attendanceDate = document.getElementById("attendanceDate");
const loadAttendanceButton = document.getElementById("loadAttendance");
const attendanceBody = document.getElementById("attendanceBody");
const saveAttendanceButton = document.getElementById("saveAttendance");
const attendanceMessage = document.getElementById("attendanceMessage");

const searchName = document.getElementById("searchName");
const searchButton = document.getElementById("searchButton");
const showAllButton = document.getElementById("showAll");
const searchMessage = document.getElementById("searchMessage");

const sortBy = document.getElementById("sortBy");
const studentBody = document.getElementById("studentBody");

const totalStudents = document.getElementById("totalStudents");
const presentToday = document.getElementById("presentToday");
const absentToday = document.getElementById("absentToday");
const excusedToday = document.getElementById("excusedToday");
const droppedStudents = document.getElementById("droppedStudents");


// ==========================================
// DATE FUNCTIONS
// ==========================================

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSelectedDate() {
  if (!attendanceDate.value) {
    attendanceDate.value = getToday();
  }

  return attendanceDate.value;
}


// ==========================================
// REGISTER STUDENT
// ==========================================

studentForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const name = studentName.value.trim();
  const scoreText = studentScore.value.trim();
  const score = Number(scoreText);

  if (!name) {
    registerMessage.textContent =
      "Please enter the student's name.";
    return;
  }

  if (
    scoreText === "" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    registerMessage.textContent =
      "Score must be between 0 and 100.";
    return;
  }

  if (list.findByName(name)) {
    registerMessage.textContent =
      "Student is already registered.";
    return;
  }

  list.addStudent(name, score);

  saveData();

  registerMessage.textContent =
    "Student registered successfully!";

  studentForm.reset();

  searchResults = null;
  searchName.value = "";
  searchMessage.textContent = "";

  renderStudents();
  renderAttendance();
  updateDashboard();
});


// ==========================================
// RENDER ATTENDANCE
// ==========================================

function renderAttendance() {
  const students = sortAlphabetically(list.getAllStudents());
  const date = getSelectedDate();

  attendanceBody.innerHTML = "";

  if (students.length === 0) {
    attendanceBody.innerHTML =
      '<tr><td colspan="4">No students registered yet.</td></tr>';
    return;
  }

  students.forEach(student => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const reasonCell = document.createElement("td");
    const percentageCell = document.createElement("td");

    nameCell.textContent = student.name;

    if (student.isDroppedOnDate(date)) {
      const label = document.createElement("span");
      label.className = "dropped-label";
      label.textContent = " DROPPED";
      nameCell.appendChild(label);

      const statusLabel = document.createElement("span");
      statusLabel.className = "dropped-label";
      statusLabel.textContent = "DROPPED";

      statusCell.appendChild(statusLabel);
      reasonCell.textContent = "-";

    } else {
      const select = document.createElement("select");

      select.className = "attendance-status";
      select.dataset.id = student.id;

      const savedStatus = student.getStatus(date);

      const options = [
        ["", "Select Status"],
        ["Present", "Present"],
        ["Absent", "Absent"],
        ["Excused", "Excused"]
      ];

      options.forEach(([value, label]) => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;
        option.selected = savedStatus === value;

        select.appendChild(option);
      });

      statusCell.appendChild(select);

      // ======================================
      // EXPANDING EXCUSE REASON TEXTAREA
      // ======================================

      const reasonInput = document.createElement("textarea");

      reasonInput.className = "reason-input";
      reasonInput.dataset.reasonId = student.id;
      reasonInput.placeholder = "Enter excuse reason";
      reasonInput.value = student.getReason(date);
      reasonInput.rows = 1;
      reasonInput.disabled = savedStatus !== "Excused";

      // Automatically resize according to text
      function resizeReasonBox() {
        reasonInput.style.height = "auto";
        reasonInput.style.height =
          reasonInput.scrollHeight + "px";
      }

      reasonInput.addEventListener("input", resizeReasonBox);

      reasonInput.addEventListener("focus", resizeReasonBox);

      reasonCell.appendChild(reasonInput);

      resizeReasonBox();

      // Enable or disable excuse reason
      select.addEventListener("change", function() {
        reasonInput.disabled = select.value !== "Excused";

        if (select.value !== "Excused") {
          reasonInput.value = "";
          reasonInput.style.height = "auto";
        } else {
          resizeReasonBox();
          reasonInput.focus();
        }
      });
    }

    percentageCell.textContent =
      `${student.getAttendancePercentage()}%`;

    row.append(
      nameCell,
      statusCell,
      reasonCell,
      percentageCell
    );

    attendanceBody.appendChild(row);
  });
}


// ==========================================
// LOAD ATTENDANCE
// ==========================================

loadAttendanceButton.addEventListener("click", function() {
  renderAttendance();

  attendanceMessage.textContent =
    "Attendance list loaded.";
});


// ==========================================
// SAVE ATTENDANCE
// ==========================================

saveAttendanceButton.addEventListener("click", function() {
  const date = getSelectedDate();

  const attendanceSelects =
    document.querySelectorAll(".attendance-status");

  for (const select of attendanceSelects) {
    if (!select.value) {
      attendanceMessage.textContent =
        "Please select an attendance status for every student.";

      select.focus();
      return;
    }

    if (select.value === "Excused") {
      const reasonInput = document.querySelector(
        `[data-reason-id="${select.dataset.id}"]`
      );

      if (!reasonInput || !reasonInput.value.trim()) {
        attendanceMessage.textContent =
          "Please provide an excuse reason for every excused student.";

        reasonInput?.focus();
        return;
      }
    }
  }

  attendanceSelects.forEach(select => {
    const student = list.students.find(
      item => item.id === Number(select.dataset.id)
    );

    if (!student || student.isDroppedOnDate(date)) return;

    const reasonInput = document.querySelector(
      `[data-reason-id="${select.dataset.id}"]`
    );

    student.attendance[date] = {
      status: select.value,
      reason: select.value === "Excused"
        ? reasonInput.value.trim()
        : ""
    };
  });

  saveData();

  attendanceMessage.textContent =
    "Attendance saved successfully!";

  renderAttendance();
  renderStudents(searchResults);
  updateDashboard();
});


// ==========================================
// SEARCH STUDENT
// ==========================================

searchButton.addEventListener("click", function() {
  const query = searchName.value.trim().toLowerCase();

  if (!query) {
    searchMessage.textContent =
      "Please enter a student name.";
    return;
  }

  searchResults = list.getAllStudents().filter(student =>
    student.name.toLowerCase().includes(query)
  );

  searchResults = sortAlphabetically(searchResults);

  searchMessage.textContent = searchResults.length
    ? `${searchResults.length} student(s) found.`
    : "No student found.";

  renderStudents(searchResults);
});


// Allow Enter key when searching
searchName.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    searchButton.click();
  }
});


// ==========================================
// SHOW ALL STUDENTS
// ==========================================

showAllButton.addEventListener("click", function() {
  searchName.value = "";
  searchResults = null;
  searchMessage.textContent = "";

  renderStudents();
});


// ==========================================
// RANKING
// ==========================================

function getRankValue(student) {
  if (sortBy.value === "attendance") {
    return student.getAttendancePercentage();
  }

  return student.score;
}


// ==========================================
// DISPLAY STUDENT RECORDS
// ==========================================

function renderStudents(customList = null) {
  const allStudents = list.getAllStudents();

  const studentsToDisplay = customList ?? allStudents;

  studentBody.innerHTML = "";

  if (studentsToDisplay.length === 0) {
    studentBody.innerHTML =
      '<tr><td colspan="9">No students registered yet.</td></tr>';
    return;
  }

  const uniqueValues = [
    ...new Set(allStudents.map(getRankValue))
  ].sort((a, b) => b - a);

  const rankMap = new Map();

  uniqueValues.forEach((value, index) => {
    rankMap.set(value, index + 1);
  });

  const sortedStudents = sortAlphabetically(studentsToDisplay);

  sortedStudents.forEach(student => {
    const row = document.createElement("tr");

    const values = [
      rankMap.get(getRankValue(student)),
      student.name,
      student.score,
      student.getPresentCount(),
      student.getAbsentCount(),
      student.getExcusedCount(),
      `${student.getAttendancePercentage()}%`
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");

      cell.textContent = value;

      if (index === 3) {
        cell.classList.add("present-value");
      }

      if (index === 4) {
        cell.classList.add("absent-value");
      }

      if (index === 5) {
        cell.classList.add("excused-value");
      }

      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const statusLabel = document.createElement("span");

    if (student.dropped) {
      statusLabel.className = "dropped-label";
      statusLabel.textContent = "DROPPED";
    } else {
      statusLabel.className = "active-label";
      statusLabel.textContent = "ACTIVE";
    }

    statusCell.appendChild(statusLabel);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");

    if (student.dropped) {
      const label = document.createElement("span");

      label.className = "dropped-label";
      label.textContent = "Already Dropped";

      actionCell.appendChild(label);

    } else {
      const dropButton = document.createElement("button");

      dropButton.type = "button";
      dropButton.textContent = "Drop Student";
      dropButton.className = "drop-button";
      dropButton.dataset.id = student.id;

      actionCell.appendChild(dropButton);
    }

    row.appendChild(actionCell);

    studentBody.appendChild(row);
  });
}


// ==========================================
// DROP STUDENT
// ==========================================

studentBody.addEventListener("click", function(event) {
  const button = event.target.closest(".drop-button");

  if (!button) return;

  const id = Number(button.dataset.id);

  const student = list.students.find(
    item => item.id === id
  );

  if (!student || student.dropped) return;

  const confirmation = confirm(
    `Are you sure you want to drop ${student.name}?\n\n` +
    "The student will remain in records and rankings.\n" +
    "Their previous attendance will be preserved.\n" +
    "Future attendance will automatically show DROPPED."
  );

  if (!confirmation) return;

  student.dropped = true;
  student.droppedAt = getToday();

  saveData();

  renderStudents(searchResults);
  renderAttendance();
  updateDashboard();

  attendanceMessage.textContent =
    `${student.name} has been marked as DROPPED.`;
});


// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {
  const students = list.getAllStudents();

  const date = getSelectedDate();

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let droppedCount = 0;

  students.forEach(student => {
    if (student.dropped) {
      droppedCount++;
    }

    if (student.isDroppedOnDate(date)) {
      return;
    }

    const status = student.getStatus(date);

    if (status === "Present") {
      presentCount++;
    } else if (status === "Absent") {
      absentCount++;
    } else if (status === "Excused") {
      excusedCount++;
    }
  });

  totalStudents.textContent = students.length;
  presentToday.textContent = presentCount;
  absentToday.textContent = absentCount;
  excusedToday.textContent = excusedCount;
  droppedStudents.textContent = droppedCount;
}


// ==========================================
// SORT STUDENTS
// ==========================================

sortBy.addEventListener("change", function() {
  renderStudents(searchResults);
});


// ==========================================
// DATE CHANGE
// ==========================================

attendanceDate.addEventListener("change", function() {
  renderAttendance();
  updateDashboard();

  attendanceMessage.textContent = "";
});


// ==========================================
// INITIALIZE WEBSITE
// ==========================================

attendanceDate.value = getToday();

renderStudents();
renderAttendance();
updateDashboard();