# Supabase Edge Functions

This directory contains all Supabase Edge Functions organized by category.

## 📁 **Directory Structure**

```
functions/
├── payments/              # Payment-related functions
│   ├── invite-user/
│   ├── process-subscribers/
│   ├── sendBulkEmail/
│   ├── sendCustomEmail/
│   └── sendWelcome/
├── discovery/             # Discovery and search functions
│   └── check-user/
├── webhooks/              # Webhook handlers
│   └── unsubscribe/
└── shared/                # Shared utilities and helpers
```

## 💳 **Payment Functions**

### **invite-user**
Invites new users to the platform with payment processing.

**Endpoint**: `/functions/v1/invite-user`
**Method**: POST
**Authentication**: Admin required

### **process-subscribers**
Processes subscription payments and renewals.

**Endpoint**: `/functions/v1/process-subscribers`
**Method**: POST
**Authentication**: Service role

### **sendBulkEmail**
Sends bulk emails to user lists.

**Endpoint**: `/functions/v1/sendBulkEmail`
**Method**: POST
**Authentication**: Admin required

### **sendCustomEmail**
Sends custom email campaigns.

**Endpoint**: `/functions/v1/sendCustomEmail`
**Method**: POST
**Authentication**: Admin required

### **sendWelcome**
Sends welcome emails to new users.

**Endpoint**: `/functions/v1/sendWelcome`
**Method**: POST
**Authentication**: Service role

## 🔍 **Discovery Functions**

### **check-user**
Validates user existence and status.

**Endpoint**: `/functions/v1/check-user`
**Method**: GET
**Authentication**: Optional

**Query Parameters**:
- `email`: User email (required)
- `include_profile`: Include profile data (optional)

## 🪝 **Webhook Functions**

### **unsubscribe**
Handles email unsubscribe webhooks.

**Endpoint**: `/functions/v1/unsubscribe`
**Method**: POST
**Authentication**: Webhook signature verification

**Events Handled**:
- Email unsubscribe requests
- Newsletter opt-outs
- Communication preferences

## 🛠️ **Shared Utilities**

Common utilities and helpers used across functions.

### **Authentication**
- JWT token validation
- Role-based access control
- User session management

### **Validation**
- Input sanitization
- Parameter validation
- Error handling

### **Database**
- Supabase client initialization
- Connection pooling
- Error handling

## 🚀 **Deployment**

### **Local Development**
```bash
# Start local development server
supabase functions serve

# Test specific function
supabase functions serve check-user
```

### **Deployment**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy check-user
```

## 📋 **Development Guidelines**

### **Function Structure**
Each function should follow this structure:
```
function-name/
├── index.ts          # Main function logic
├── types.ts          # TypeScript definitions
├── utils.ts          # Function-specific utilities
└── README.md         # Function documentation
```

### **Naming Conventions**
- **Directories**: kebab-case (e.g., `check-user`)
- **Files**: kebab-case (e.g., `index.ts`, `types.ts`)
- **Endpoints**: `/functions/v1/{function-name}`
- **Environment**: Use `process.env` for configuration

### **Error Handling**
- Use standardized error responses
- Log errors for debugging
- Return appropriate HTTP status codes
- Include error details in response

### **Security**
- Validate all inputs
- Use authentication middleware
- Implement rate limiting
- Sanitize outputs

## 🔧 **Environment Variables**

Required environment variables:
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Configuration
RESEND_API_KEY=your_resend_key
EMAIL_FROM_ADDRESS=noreply@ivisit.ng

# Other Services
WEBHOOK_SECRET=your_webhook_secret
```

## 📊 **Monitoring**

### **Logging**
- Use structured logging with timestamps
- Include correlation IDs for request tracking
- Log errors with full context
- Monitor performance metrics

### **Health Checks**
- Implement health check endpoints
- Monitor function response times
- Track error rates
- Set up alerts for failures

## 🔗 **Related Documentation**

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [API Reference](../docs/REFERENCE.md)
- [Testing Guide](../docs/TESTING.md)
- [Contribution Guidelines](../docs/CONTRIBUTING.md)

---

**All functions should follow the established patterns and guidelines for consistency and maintainability.**
