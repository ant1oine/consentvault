terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Local backend by default
  backend "local" {
    path = "terraform.tfstate"
  }

  # To use S3 backend in me-central-1, uncomment and configure:
  # backend "s3" {
  #   bucket         = "consentvault-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "me-central-1"
  #   encrypt        = true
  #   dynamodb_table = "consentvault-terraform-locks"
  # }
}

provider "aws" {
  region = "me-central-1" # Hard-locked to Riyadh for PDPL compliance

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      PDPL        = "KSA-resident"
    }
  }
}

provider "random" {
  # No configuration needed
}

