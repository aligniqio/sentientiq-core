# Sage AI Assistant - Context Guide

## Overview
Sage is the Sonnet 3.5-powered support assistant for SentientIQ. When users request help, Sage receives rich context about where they are and what they're doing.

## Support Request Structure

When a user asks for help from the GTM Implementation page, Sage receives:

```json
{
  "id": "request-uuid",
  "user_id": "clerk-user-id",
  "organization_id": "clerk-org-id",
  "message": "User's help request",
  "context": {
    "page": "implementation",
    "step": "telemetry | intervention | viewing_instructions",
    "tenant_id": "organization-id-used-as-tenant",
    "user_email": "user@example.com",
    "organization_name": "Company Name",
    "debug_mode": true/false,
    "scripts_copied": {
      "telemetry": true/false,
      "intervention": true/false
    },
    "timestamp": "ISO-8601 timestamp"
  },
  "source": "gtm_implementation"
}
```

## Context Fields Explained

### `step` Field Values
- **"viewing_instructions"**: User hasn't copied any scripts yet
- **"telemetry"**: User last copied the telemetry script (Step 1)
- **"intervention"**: User last copied the intervention script (Step 2)

### Common GTM Issues to Watch For

1. **Can't find Custom HTML tag option**
   - GTM UI changed recently, it's under "Tags" > "New" > "Tag Configuration" > "Custom HTML"

2. **Trigger configuration confusion**
   - Telemetry: Needs "All Pages" trigger
   - Intervention: Needs "All Pages - DOM Ready" trigger (not just "All Pages")

3. **Preview mode not working**
   - Check if they published the container (preview vs live)
   - Verify tenant_id is correct
   - Check browser console for errors

4. **Scripts not firing**
   - Debug mode should show console logs
   - Check if other tags are blocking
   - Verify trigger conditions

## Sage Responses Should Include

1. **Acknowledgment of where they are**
   - "I see you're working on [step] in the GTM implementation"

2. **Specific GTM navigation help**
   - Step-by-step clicks in GTM interface
   - Screenshots or exact menu paths

3. **Validation steps**
   - How to check if it's working
   - What they should see in console (if debug_mode is true)

4. **Common fixes**
   - Based on the step they're on
   - Based on their message content

## Example Sage Response

```
I see you're on Step 1 (Telemetry Script) and having trouble finding where to add the Custom HTML tag in GTM.

Here's the exact path:
1. In GTM, click "Tags" in the left sidebar
2. Click the "New" button (top right)
3. Click on "Tag Configuration" (the top box)
4. Scroll down and select "Custom HTML"
5. Paste the telemetry script you copied
6. Name your tag "SentientIQ Telemetry"

For the trigger:
1. Click "Triggering" (the bottom box)
2. Select "All Pages" (should already exist)
3. Save the tag

Since you have debug mode enabled, you should see "[GTM] Telemetry loaded!" in your browser console when testing.
```

## Integration Points

### Reading Support Requests (for Sage)
```sql
SELECT * FROM support_requests
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Updating with Sage Response
```sql
UPDATE support_requests
SET
  sage_response = 'response text',
  status = 'resolved',
  responded_at = NOW()
WHERE id = 'request-uuid';
```

## Additional Context Sources

Sage should also be aware of:

1. **Implementation Page Scripts**
   - Telemetry: Loads at `https://sentientiq.ai/telemetry-v5.js`
   - Intervention: Loads at `https://sentientiq.ai/intervention-receiver.js`
   - Both use the organization ID as tenant ID

2. **Common Setup Flow**
   - User creates organization in Clerk
   - Goes to /system/implementation
   - Copies scripts (already has tenant ID populated)
   - Adds to GTM
   - Tests in preview
   - Publishes container
   - System marks them as onboarded

3. **Debug Mode**
   - When enabled, scripts log to console
   - Helps troubleshoot GTM issues
   - Should see session ID and intervention loading messages

## Training Notes for Sage

- Users are auto dealers, not technical
- GTM is confusing for them ("GTM sucks")
- Be specific about clicks and menu locations
- Validate their tenant_id matches their organization
- Remind them about preview vs published states
- Console logs are their friend when debug_mode is on