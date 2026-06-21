from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)
original_activities = deepcopy(activities)


def activity_url(activity_name: str) -> str:
    return f"/activities/{quote(activity_name, safe='')}"


@pytest.fixture(autouse=True)
def reset_activities():
    activities.clear()
    activities.update(deepcopy(original_activities))
    yield
    activities.clear()
    activities.update(deepcopy(original_activities))


def test_get_activities_returns_activity_data():
    response = client.get("/activities")
    assert response.status_code == 200

    data = response.json()
    assert "Chess Club" in data
    assert data["Chess Club"]["description"] == "Learn strategies and compete in chess tournaments"
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_for_activity_adds_new_participant():
    activity_name = "Chess Club"
    email = "teststudent@mergington.edu"

    response = client.post(f"{activity_url(activity_name)}/signup?email={quote(email, safe='')}" )
    assert response.status_code == 200
    assert f"Signed up {email} for {activity_name}" in response.json()["message"]

    assert email in activities[activity_name]["participants"]
    assert len(activities[activity_name]["participants"]) == 3


def test_signup_duplicate_participant_returns_400():
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    response = client.post(f"{activity_url(activity_name)}/signup?email={quote(email, safe='')}" )
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"


def test_signup_full_activity_returns_400():
    activity_name = "Chess Club"
    activities[activity_name]["participants"] = [f"student{i}@mergington.edu" for i in range(12)]
    email = "newstudent@mergington.edu"

    response = client.post(f"{activity_url(activity_name)}/signup?email={quote(email, safe='')}" )
    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"


def test_remove_participant_unsubscribes_student():
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    response = client.delete(f"{activity_url(activity_name)}/participants?email={quote(email, safe='')}" )
    assert response.status_code == 200
    assert f"Removed {email} from {activity_name}" in response.json()["message"]
    assert email not in activities[activity_name]["participants"]


def test_remove_nonexistent_participant_returns_400():
    activity_name = "Chess Club"
    email = "notregistered@mergington.edu"

    response = client.delete(f"{activity_url(activity_name)}/participants?email={quote(email, safe='')}" )
    assert response.status_code == 400
    assert response.json()["detail"] == "Student not signed up for this activity"
