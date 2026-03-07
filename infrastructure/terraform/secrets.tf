# Store API key in Secret Manager
resource "google_secret_manager_secret" "api_key" {
  secret_id = "gemini-api-key"
  
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.api_key
}

# Service Account for Cloud Run
resource "google_service_account" "operator" {
  account_id   = "personal-operator-sa"
  display_name = "Personal AI Operator Service Account"
}

# Grant access to Secret Manager
resource "google_secret_manager_secret_iam_member" "operator" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.operator.email}"
}
