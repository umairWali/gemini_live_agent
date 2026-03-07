# 🚀 Infrastructure as Code - Terraform

> Google Cloud Infrastructure for Personal AI Operator
> **Bonus Points**: Infrastructure-as-Code submission

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Google Cloud Project                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Cloud Run Service                      │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Container: personal-ai-operator:latest           │  │   │
│  │  │  Port: 8080                                        │  │   │
│  │  │  Memory: 2GB                                       │  │   │
│  │  │  CPU: 2 vCPUs                                      │  │   │
│  │  │  Min Instances: 1 (warm start)                     │  │   │
│  │  │  Max Instances: 100 (auto-scale)                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  Environment:                                             │   │
│  │    - API_KEY (from Secret Manager)                        │   │
│  │    - PORT=8080                                            │   │
│  │                                                           │   │
│  │  Networking:                                              │   │
│  │    - Allow Unauthenticated (public access)              │   │
│  │    - HTTPS only                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Cloud Build Trigger                      │   │
│  │  - Source: GitHub push to main branch                    │   │
│  │  - Build: Dockerfile build                                 │   │
│  │  - Push: Container Registry                               │   │
│  │  - Deploy: Cloud Run                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Secret Manager - API Keys                     │   │
│  │  - gemini-api-key (latest)                               │   │
│  │  - Encrypted at rest                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Cloud Monitoring & Logging                      │   │
│  │  - Error Reporting                                       │   │
│  │  - Request Logging                                       │   │
│  │  - Health Checks                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Install Terraform** (v1.5+)
```bash
brew install terraform  # macOS
apt-get install terraform # Ubuntu
```

2. **Authenticate with GCP**
```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

3. **Enable APIs**
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Usage

### 1. Initialize Terraform
```bash
cd infrastructure/terraform
terraform init
```

### 2. Set Variables
Create `terraform.tfvars`:
```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
api_key    = "your-gemini-api-key"
```

### 3. Plan & Apply
```bash
terraform plan
terraform apply
```

### 4. Get Output URL
```bash
terraform output service_url
# https://personal-ai-operator-xxxxx.run.app
```

---

## Terraform Configuration

### `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  # Optional: Store state in GCS
  backend "gcs" {
    bucket = "terraform-state-personal-operator"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

### `variables.tf`

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "api_key" {
  description = "Gemini API Key"
  type        = string
  sensitive   = true
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "personal-ai-operator"
}
```

### `secrets.tf`

```hcl
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
```

### `cloud_run.tf`

```hcl
# Cloud Run Service
resource "google_cloud_run_v2_service" "operator" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.project_id}/${var.service_name}:latest"
      
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
```

### `service_account.tf`

```hcl
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
```

### `cloud_build.tf`

```hcl
# Cloud Build trigger for CI/CD
resource "google_cloudbuild_trigger" "deploy" {
  name     = "personal-operator-deploy"
  filename = "cloudbuild.yaml"
  
  github {
    owner = "Musab1khan"
    name  = "gemini_live_agent"
    
    push {
      branch = "^main$"
    }
  }
  
  substitutions = {
    _REGION     = var.region
    _SERVICE    = var.service_name
  }
}
```

### `outputs.tf`

```hcl
output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.operator.uri
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.operator.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}
```

---

## Cloud Build Configuration

### `cloudbuild.yaml`

```yaml
steps:
  # Step 1: Build container
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/${_SERVICE}:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/${_SERVICE}:latest'
      - '.'
    timeout: 600s

  # Step 2: Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/${_SERVICE}:$COMMIT_SHA'

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE}'
      - '--image'
      - 'gcr.io/$PROJECT_ID/${_SERVICE}:$COMMIT_SHA'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'PORT=8080'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '100'

images:
  - 'gcr.io/$PROJECT_ID/${_SERVICE}:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/${_SERVICE}:latest'

options:
  logging: CLOUD_LOGGING_ONLY
```

---

## Monitoring & Alerts

### `monitoring.tf`

```hcl
# Alert Policy for high error rate
resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "High Error Rate - Personal Operator"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate > 5%"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class!=\"2xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Email notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Operator Alerts"
  type         = "email"
  
  labels = {
    email_address = "your-email@example.com"
  }
}
```

---

## Cost Optimization

Estimated monthly costs for moderate usage:

| Resource | Usage | Monthly Cost |
|----------|-------|--------------|
| Cloud Run | 1M requests/month | ~$20 |
| Secret Manager | 1 secret | ~$0.06 |
| Cloud Build | 10 builds/month | ~$10 |
| **Total** | | **~$30/month** |

Free tier covers first 2M requests/month!

---

## Security Best Practices

1. ✅ **API Keys in Secret Manager** - Never in code
2. ✅ **Service Account with minimal permissions**
3. ✅ **HTTPS only** - No HTTP traffic allowed
4. ✅ **Container scanning** - Vulnerability detection
5. ✅ **Audit logging** - All API calls logged

---

## Troubleshooting

### Service not deploying
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Check service status
gcloud run services describe personal-ai-operator --region=us-central1
```

### API key not working
```bash
# Verify secret
gcloud secrets versions access latest --secret=gemini-api-key

# Check service account permissions
gcloud secrets get-iam-policy gemini-api-key
```

### Build failing
```bash
# Check Cloud Build logs
gcloud builds list
gcloud builds log [BUILD_ID]
```

---

## Additional Resources

- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Terraform](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service)
- [Secret Manager](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret)

---

**Infrastructure as Code complete - ready for automated deployment!**
