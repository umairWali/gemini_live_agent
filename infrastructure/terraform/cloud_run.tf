# Cloud Run Service
resource "google_cloud_run_v2_service" "operator" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.container_image
      
      ports {
        container_port = 8080
      }
      
      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
      
      env {
        name  = "PORT"
        value = "8080"
      }
      
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.secret_id
            version = "latest"
          }
        }
      }
    }
    
    scaling {
      min_instances = 1
      max_instances = 100
    }
    
    service_account = google_service_account.operator.email
  }
}

# Allow unauthenticated access
resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.operator.location
  name     = google_cloud_run_v2_service.operator.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
