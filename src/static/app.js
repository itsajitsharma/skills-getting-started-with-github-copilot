document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and rebuild activity dropdown
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML = details.participants.length
          ? `<div class="participants"><strong>Participants:</strong><ul class="participants-list">${details.participants
              .map(
                (participant) =>
                  `<li><span>${participant}</span><button type="button" class="remove-participant" data-activity="${name}" data-email="${participant}" aria-label="Remove ${participant}">✕</button></li>`
              )
              .join("")}</ul></div>`
          : `<div class="participants participants-empty"><strong>Participants:</strong> <span>No signups yet</span></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function removeParticipant(activityName, email) {
    const response = await fetch(
      `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
      { method: "DELETE", cache: "no-store" }
    );
    const result = await response.json();
    return { response, result };
  }

  activitiesList.addEventListener("click", async (event) => {
    if (!event.target.matches(".remove-participant")) {
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    try {
      const { response, result } = await removeParticipant(activity, email);

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        await fetchActivities();
      } else {
        const detail = result.detail || "An error occurred";
        messageDiv.textContent = detail;
        messageDiv.className = "message error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "message error";
      console.error("Error removing participant:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        await fetchActivities();
      } else {
        const detail = result.detail || "An error occurred";
        let friendly = detail;
        if (detail === "Student already signed up for this activity") {
          friendly = "You're already signed up for that activity.";
        } else if (detail === "Activity is full") {
          friendly = "Sorry — this activity is full.";
        } else if (detail === "Activity not found") {
          friendly = "Selected activity not found.";
        }

        messageDiv.textContent = friendly;
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
