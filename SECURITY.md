# Security Policy

## 🔐 Security Overview

The `drm-mcp` project takes security seriously. This document outlines our security practices, how to report vulnerabilities, and guidelines for secure usage.

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| < 3.0   | :x:                |

## 🛡️ Security Features

### Credential Management

This project implements secure credential management through:

1. **Environment Variables**: API credentials are loaded from environment variables, never hardcoded
2. **AWS Secrets Manager**: Production deployments support AWS Secrets Manager integration
3. **Multi-Tenant Isolation**: Each user's credentials are isolated and managed separately
4. **Proper .gitignore**: Sensitive files (`.env`, `credentials.json`) are excluded from version control

### Security Best Practices

- ✅ No hardcoded secrets or credentials
- ✅ Automated secret scanning with Gitleaks
- ✅ Docker security: non-root user, minimal base image
- ✅ Example files use placeholder values only
- ✅ Secure credential loading with fallback mechanisms

## 🚨 Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities.

### How to Report

**For sensitive security issues**, please do NOT create a public GitHub issue. Instead:

1. **Email**: Send details to [security contact - add your email here]
2. **GitHub Security Advisory**: Use GitHub's [Security Advisories](https://github.com/flinntech/drm-mcp/security/advisories/new) feature
3. **Encrypted Communication**: For highly sensitive issues, request our PGP key

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)
- Your contact information for follow-up

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution**: Varies based on severity (critical issues prioritized)
- **Disclosure**: Coordinated disclosure after patch is available

## 🔒 Security Guidelines for Users

### Development Environment

1. **Never commit credentials**:
   ```bash
   # ❌ Don't do this
   git add .env
   git commit -m "Add config"
   
   # ✅ Use example files instead
   cp .env.example .env
   # Edit .env with your credentials
   # .env is gitignored and won't be committed
   ```

2. **Use environment variables**:
   ```bash
   # Set credentials as environment variables
   export DRM_API_KEY_ID="your_api_key_id"
   export DRM_API_KEY_SECRET="your_api_key_secret"
   ```

3. **Install pre-commit hooks** (recommended):
   ```bash
   npm install --save-dev husky
   npx husky install
   npx husky add .husky/pre-commit "gitleaks protect --staged"
   ```

### Production Deployment

#### AWS Secrets Manager (Recommended)

For production deployments, use AWS Secrets Manager:

1. **Store credentials in AWS Secrets Manager**:
   ```bash
   aws secretsmanager create-secret \
     --name drm-mcp/credentials \
     --secret-string '{"DRM_API_KEY_ID":"xxx","DRM_API_KEY_SECRET":"yyy"}'
   ```

2. **Configure IAM role** for ECS task:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "secretsmanager:GetSecretValue",
           "secretsmanager:DescribeSecret"
         ],
         "Resource": "arn:aws:secretsmanager:region:account:secret:drm-mcp/*"
       }
     ]
   }
   ```

3. **Set environment variable**:
   ```bash
   export AWS_SECRET_NAME="drm-mcp/credentials"
   ```

#### Docker Production

For Docker deployments:

1. **Use Docker secrets** (Docker Swarm):
   ```bash
   echo "your_api_key_id" | docker secret create drm_api_key_id -
   echo "your_api_key_secret" | docker secret create drm_api_key_secret -
   ```

2. **Use environment variables** from secure source:
   ```bash
   # Load from secure vault
   docker run -e DRM_API_KEY_ID=$(vault read -field=api_key_id secret/drm) \
              -e DRM_API_KEY_SECRET=$(vault read -field=api_key_secret secret/drm) \
              drm-mcp-server
   ```

3. **Never build credentials into images**:
   ```dockerfile
   # ❌ Don't do this
   ENV DRM_API_KEY_ID="hardcoded_value"
   
   # ✅ Load at runtime
   ENV DRM_API_KEY_ID=""
   ```

### Multi-Tenant Deployments

For multi-tenant setups:

1. **Create credentials.json** (development only):
   ```json
   {
     "user1": {
       "api_key_id": "user1_key_id",
       "api_key_secret": "user1_key_secret"
     }
   }
   ```
   **Important**: Never commit `credentials.json` to version control!

2. **Production**: Use per-request credentials in HTTP headers:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "X-User-ID: user1" \
     -H "X-DRM-API-Key-Id: ${USER1_KEY_ID}" \
     -H "X-DRM-API-Key-Secret: ${USER1_KEY_SECRET}"
   ```

## 🔍 Security Scanning

### Automated Scanning

This repository includes:

- **GitHub Actions**: Automated secret scanning on every push/PR
- **Gitleaks**: Detects hardcoded secrets and credentials
- **TruffleHog**: Identifies high-entropy strings that may be secrets

### Manual Scanning

To run security scans locally:

```bash
# Install gitleaks
brew install gitleaks  # macOS
# or download from: https://github.com/gitleaks/gitleaks/releases

# Scan current files
gitleaks detect --source . --verbose

# Scan before commit
gitleaks protect --staged --verbose
```

## 🔐 API Key Security

### Digi Remote Manager API Keys

1. **Get API keys** from: https://remotemanager.digi.com
   - Go to Profile → API Keys
   - Generate new API key pair (ID + Secret)

2. **Store securely**:
   - Local development: `.env` file (gitignored)
   - Production: AWS Secrets Manager or similar
   - CI/CD: GitHub Secrets or similar

3. **Rotate regularly**:
   - Rotate API keys every 90 days
   - Immediately rotate if compromised
   - Use AWS Secrets Manager rotation for automation

4. **Principle of least privilege**:
   - Create separate API keys for different environments (dev/staging/prod)
   - Use separate keys for different services
   - Grant minimum necessary permissions

### Key Rotation Procedure

If you suspect a key has been compromised:

1. **Immediately revoke** the compromised key in Digi Remote Manager
2. **Generate new key** pair
3. **Update** all services using the old key
4. **Verify** all services are working with new key
5. **Monitor** for any unauthorized access
6. **Report** the incident if credentials were exposed publicly

## 🛠️ Security Checklist for Contributors

Before submitting a PR:

- [ ] No hardcoded credentials or secrets
- [ ] No `.env` or `credentials.json` files committed
- [ ] Example files use placeholder values only
- [ ] Security scan passes (Gitleaks/TruffleHog)
- [ ] Dependencies are up to date (no known vulnerabilities)
- [ ] Docker images use non-root user
- [ ] API endpoints validate input
- [ ] Error messages don't expose sensitive information

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

## 📞 Contact

For security concerns:
- **GitHub Issues**: For non-sensitive security improvements
- **Security Advisory**: For vulnerability reports
- **Email**: [Add security contact email]

## 🏆 Security Hall of Fame

We recognize security researchers who help us improve:

<!-- Add security researchers who reported vulnerabilities -->

---

**Last Updated**: October 29, 2025  
**Version**: 1.0
