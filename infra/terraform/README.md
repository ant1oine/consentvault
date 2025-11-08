# ConsentVault Production Infrastructure (AWS Riyadh)

This directory contains Terraform configuration for deploying ConsentVault to AWS in the `me-central-1` (Riyadh) region with PDPL compliance.

## 🚨 Important: PDPL Compliance

**All resources are hard-locked to `me-central-1` (Riyadh) region.**

- ✅ All compute, storage, logs, and backups remain in KSA
- ✅ No cross-border data transfer
- ✅ No global services or cross-region endpoints
- ✅ All encryption keys managed in me-central-1

**Do not change the region in any configuration files.**

## Prerequisites

1. **AWS CLI configured** with credentials for the target account
2. **Terraform >= 1.5.0** installed
3. **Route 53 hosted zone** for your domain in me-central-1 (or delegate to AWS)
4. **GitHub repository** configured with OIDC provider (see below)

## Quick Start

### 1. Configure Variables

Create `terraform.tfvars`:

```hcl
project_name = "consentvault"
environment  = "prod"
domain_name  = "yourdomain.sa"
hosted_zone_id = ""  # Leave empty if Terraform should auto-detect

# Optional overrides
api_desired_count = 2
api_cpu           = 512
api_memory        = 1024
db_instance_class = "db.t4g.medium"
redis_node_type   = "cache.t4g.small"

# Security
allowed_cidrs = ["0.0.0.0/0"]  # Restrict to your office IPs in production

# Backups
rds_backup_retention_period = 14
rds_deletion_protection     = true
log_retention_days          = 90
```

### 2. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

### 3. Plan Deployment

```bash
terraform plan -var="domain_name=yourdomain.sa"
```

Review the plan carefully. It will create:
- VPC with public/private subnets across 2 AZs
- RDS PostgreSQL (Multi-AZ, encrypted)
- ElastiCache Redis (Multi-AZ, TLS)
- ECS Fargate cluster
- Application Load Balancer with ACM certificate
- Secrets Manager secrets
- CloudWatch log groups
- IAM roles and security groups

### 4. Apply Infrastructure

```bash
terraform apply -var="domain_name=yourdomain.sa"
```

This will:
1. Create all AWS resources
2. Generate random passwords for RDS and Redis
3. Store secrets in Secrets Manager
4. Request ACM certificate and create DNS validation records
5. Wait for certificate validation (may take a few minutes)

### 5. Post-Deployment

After `terraform apply` completes, you'll see outputs:

```
API URL: https://api.yourdomain.sa
RDS endpoint: consentvault-prod-db.xxxxx.rds.amazonaws.com
Redis endpoint: consentvault-prod-redis.xxxxx.cache.amazonaws.com
ECR repository: 123456789012.dkr.ecr.me-central-1.amazonaws.com/consentvault/api
```

**Next steps:**

1. **Push Docker image to ECR:**
   ```bash
   aws ecr get-login-password --region me-central-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url | cut -d'/' -f1)
   docker build -f api.Dockerfile.prod -t consentvault/api:latest .
   docker tag consentvault/api:latest $(terraform output -raw ecr_repository_url):latest
   docker push $(terraform output -raw ecr_repository_url):latest
   ```

2. **Update ECS service** to use the new image (or use GitHub Actions workflow)

3. **Run database migrations:**
   ```bash
   # Via ECS run-task (see CI/CD workflow)
   # Or manually:
   aws ecs run-task \
     --cluster consentvault-prod \
     --task-definition consentvault-prod-api \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
     --overrides '{"containerOverrides":[{"name":"api","command":["alembic","upgrade","head"]}]}'
   ```

## Architecture

```
Internet
   │
   ▼
ALB (HTTPS 443) ──► ECS Fargate (API tasks in private subnets)
                         │
                         ├──► RDS PostgreSQL (private, Multi-AZ)
                         └──► ElastiCache Redis (private, Multi-AZ, TLS)
```

**Key Components:**
- **VPC**: 2 AZs, public subnets for ALB, private subnets for ECS/RDS/Redis
- **ALB**: Internet-facing, HTTPS only (HTTP→HTTPS redirect)
- **ECS**: Fargate tasks in private subnets, no public IPs
- **RDS**: PostgreSQL 16, Multi-AZ, encrypted at rest with KMS
- **Redis**: ElastiCache with TLS, Multi-AZ replicas
- **Secrets**: Stored in Secrets Manager, encrypted with KMS
- **Logs**: CloudWatch Logs in me-central-1

## Security

### Network Security
- ALB only accepts traffic from `allowed_cidrs`
- ECS tasks in private subnets, no public IPs
- RDS and Redis not publicly accessible
- Security groups enforce least privilege

### Encryption
- **At rest**: RDS (KMS), Redis (at rest), ECR, CloudWatch (default)
- **In transit**: ALB HTTPS (TLS 1.2+), Redis TLS required

### IAM
- ECS tasks have minimal permissions (ECR pull, Secrets read, CloudWatch write)
- GitHub Actions role scoped to ECR/ECS operations only

## Secrets Management

Secrets are stored in AWS Secrets Manager:

- `consentvault/prod/app-secrets`: DATABASE_URL, REDIS_URL, MASTER_ENCRYPTION_KEY, etc.
- `consentvault/prod/db-password`: RDS password
- `consentvault/prod/redis-password`: Redis auth token

ECS tasks automatically inject secrets as environment variables.

## Monitoring

- **CloudWatch Logs**: `/ecs/consentvault-prod-api` (90 day retention)
- **ECS Service**: Monitor task health and desired count
- **ALB**: Health checks on `/healthz` endpoint
- **RDS**: CloudWatch metrics for CPU, memory, connections
- **Redis**: CloudWatch metrics for cache hits/misses

## Backups

- **RDS**: Automated daily backups, 14-day retention (configurable)
- **Snapshots**: Final snapshot created before deletion (if enabled)
- **Redis**: No automatic backups (stateless cache)

## Cost Optimization

- Use `t4g` instance types (ARM-based, lower cost)
- RDS storage auto-scaling (100GB → 500GB)
- CloudWatch log retention (90 days default)
- Consider Reserved Instances for RDS in production

## Troubleshooting

### Certificate Validation Fails
- Ensure Route 53 hosted zone exists in me-central-1
- Check DNS validation records were created
- Wait 5-10 minutes for DNS propagation

### ECS Tasks Not Starting
- Check CloudWatch Logs for errors
- Verify Secrets Manager secrets exist
- Ensure security groups allow traffic
- Check ECR image exists and is accessible

### Database Connection Errors
- Verify RDS endpoint is correct
- Check security group allows traffic from ECS tasks
- Ensure DATABASE_URL in Secrets Manager is correct

### Redis Connection Errors
- Use `rediss://` (with double 's') for TLS
- Verify Redis password in Secrets Manager
- Check security group allows traffic from ECS tasks

## Updating Infrastructure

```bash
# Make changes to .tf files
terraform plan
terraform apply
```

**Note**: Some changes require manual intervention:
- RDS instance class changes may cause downtime
- VPC changes may require service restarts
- Certificate changes require DNS validation

## Destroying Infrastructure

⚠️ **Warning**: This will delete all resources including databases!

```bash
terraform destroy -var="domain_name=yourdomain.sa"
```

Set `rds_deletion_protection = false` in variables first if you want to allow deletion.

## GitHub Actions Setup

1. **Create OIDC Provider** (one-time, per AWS account):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. **Update IAM role** in `main.tf`:
   - Replace `YOUR_GITHUB_ORG` with your GitHub organization/username
   - The role ARN will be in Terraform outputs

3. **Configure GitHub Secrets**:
   - `AWS_ACCOUNT_ID`: Your AWS account ID
   - `AWS_REGION`: `me-central-1`
   - `PROD_DOMAIN`: Your domain (e.g., `yourdomain.sa`)
   - `PROD_SUBDOMAIN`: `api`
   - `AWS_ROLE_ARN`: Output from `terraform output github_actions_role_arn`

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review ECS service events
3. Verify security group rules
4. Check Secrets Manager values

