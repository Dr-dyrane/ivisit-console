# Testing Guide for iVisit Console Supabase Schema

## 🎯 Overview

This guide outlines the task-based testing framework for ensuring Supabase schema integrity and functionality in the ivisit-console workspace.

## 🧪 Testing Structure

### **Directory Organization**
```
supabase/tests/
├── tasks/                        # Task definitions and validation
│   └── [task files].md         # Task definitions with objectives
├── scripts/                      # Test execution scripts (JavaScript)
│   └── [test scripts].js         # Test execution and validation
├── fixes/                        # Mini SQL fixes for errors
│   └── [fix files].sql           # Targeted SQL fixes
├── validation/                   # Validation results and reports
│   ├── test_results.json         # Test results storage
│   ├── error_log.json           # Error log storage
│   └── validation_report.md     # Validation reports
└── archives/                     # Archived test results
    └── historical_tests/        # Past test runs
```

## 🔄 Testing Workflow

### **Step 1: Task Definition**
- Create task validation file with clear objectives
- Define error constraints and success criteria
- Set prerequisites and dependencies

### **Step 2: Test Execution**
```bash
# Run comprehensive system test
node supabase/tests/scripts/test_runner.js console_comprehensive

# Run specific task
node supabase/tests/scripts/test_runner.js [task_name]
```

### **Step 3: Error Detection & Logging**
- JavaScript test runner detects errors automatically
- Errors categorized as Critical/Warning/Info
- Detailed error logs written to `validation/error_log.json`

### **Step 4: Fix Generation**
- Mini SQL fixes generated automatically for common errors
- Targeted fixes stored in `fixes/` directory
- Fixes designed to be idempotent and safe

### **Step 5: Fix Application**
```bash
# Apply fixes from error_fixes.sql
# (Manual execution or automated via test runner)
```

### **Step 6: Migration Integration**
- Update core migration pillars with successful fixes
- Remove redundant fix migrations
- Sync changes to console

### **Step 7: Final Validation**
- Run comprehensive test suite again
- Confirm 100% success rate
- Generate final validation report

## 📋 **Testing Standards**

### **Success Criteria**
- **100% test pass rate** required
- **No schema cache errors**
- **All modules deployed**
- **Console functions operational**
- **Display ID mapping working**

### **Error Classification**
- **Critical**: Block deployment (missing functions, tables)
- **Warning**: Fix required (missing columns, naming issues)
- **Info**: Monitor only (empty tables, optional features)

### **Fix Process**
1. **Detect error** through automated testing
2. **Log error** with full context and categorization
3. **Generate fix** using SQL templates
4. **Apply fix** manually or automatically
5. **Validate fix** with re-testing
6. **Integrate fix** into core migrations
7. **Sync to console** and validate

## 🎯 **Console-Specific Testing**

### **Function Testing**
Test all console-specific functions:
- **check-user**: User validation and status
- **invite-user**: User invitation system
- **process-subscribers**: Subscription processing
- **sendBulkEmail**: Bulk email campaigns
- **sendCustomEmail**: Custom email campaigns
- **sendWelcome**: Welcome email automation
- **unsubscribe**: Email unsubscribe handling

### **Integration Testing**
Test console-specific integrations:
- **Email service integration** (Resend)
- **User management workflows**
- **Subscription processing**
- **Webhook handling**

### **Schema Validation**
Validate console-specific schema elements:
- **User management tables**
- **Subscription and billing tables**
- **Email template system**
- **Webhook event handling**

## 🚀 **Getting Started with Console Testing**

### **For Developers**
1. **Define task** in `tests/tasks/` directory
2. **Run test runner** with task name
3. **Review error logs** in `validation/error_log.json`
4. **Apply fixes** from `fixes/` directory
5. **Validate fixes** and update migrations

### **For Testing**
1. **Use comprehensive test runner** for full validation
2. **Check error logs** for issues and patterns
3. **Apply targeted fixes** for identified problems
4. **Run validation** to confirm fixes work
5. **Document results** in validation reports

### **For Maintenance**
1. **Monitor error logs** for recurring issues
2. **Update test scenarios** for new features
3. **Maintain fix library** for common problems
4. **Archive old test results** periodically

## 📊 **Console Test Categories**

### **1. User Management Tests**
- User creation and validation
- Role-based access control
- Profile management
- Authentication workflows

### **2. Email System Tests**
- Email delivery validation
- Template rendering tests
- Bulk email processing
- Unsubscribe handling

### **3. Subscription Tests**
- Payment processing workflows
- Subscription renewal logic
- Billing integration
- Webhook event handling

### **4. Integration Tests**
- Third-party service integrations
- API endpoint validation
- Data synchronization
- Error handling workflows

## 🔧 **Console-Specific Tools**

### **Test Runner Customization**
The console test runner should include:
- **Email service testing** (Resend integration)
- **Subscription validation** (payment processing)
- **User workflow testing** (invitation, onboarding)
- **Webhook validation** (event processing)

### **4. Security Functions**
- **is_admin**: Role-based access control
- **RLS policies**: Active and functional
- **Data protection**: Proper access levels

### **5. Display ID Resolution**
- **id_mappings table**: Central resolution system
- **get_entity_id**: UUID to display ID conversion
- **Entity types**: All supported types

### **6. Wallet System**
- **Patient wallets**: Financial operations
- **Organization wallets**: Provider accounts
- **Payment processing**: Transaction handling

## 🛠️ Test Environment Setup

### **Required Environment Variables**
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Dependencies**
```bash
npm install @supabase/supabase-js
```

## 📊 Test Data Requirements

### **Empty Database Testing**
- Tests validate **structure and functionality**
- **No test data required** for basic validation
- **Zero records expected** in clean deployment

### **Data Import Testing**
```bash
# Test data import functionality
node supabase/scripts/data_import_fixed.js
```

## 🎯 Quality Gates

### **Before Schema Changes**
- [ ] Current tests passing (100%)
- [ ] Migration status clean
- [ ] All modules deployed
- [ ] No schema cache errors

### **After Schema Changes**
- [ ] Tests still passing (100%)
- [ ] New functionality working
- [ ] No regressions introduced
- [ ] Documentation updated

### **Before Production Deployment**
- [ ] All tests passing in staging
- [ ] Migration history clean
- [ ] Console documentation updated
- [ ] Performance validated

## 🚨 Troubleshooting

### **Common Issues**
1. **Schema cache errors**: Run `supabase db push --debug`
2. **Missing functions**: Check migration deployment order
3. **RLS policy failures**: Verify policy definitions
4. **Display ID errors**: Check id_mappings table

### **Debug Commands**
```bash
# Check migration status
npx supabase migration list

# Force schema refresh
npx supabase db push --include-all

# Test specific function
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
supabase.rpc('function_name').then(console.log);
"
```

## 📈 Performance Testing

### **Query Performance**
- **Geospatial queries**: Test with various distances
- **Complex joins**: Validate emergency request flows
- **Index usage**: Ensure proper query optimization

### **Load Testing**
- **Concurrent requests**: Multiple emergency creations
- **Transaction integrity**: Payment processing under load
- **Rate limiting**: API endpoint protection

## 🔄 Continuous Testing

### **Automated Testing**
- **Pre-commit hooks**: Run tests before commits
- **CI/CD integration**: Automated test execution
- **Scheduled tests**: Regular system validation

### **Manual Testing**
- **Feature validation**: New functionality testing
- **Regression testing**: Ensure no breaking changes
- **User acceptance**: Real-world scenario testing

---

**Remember**: 100% test success rate is mandatory for all schema changes.
