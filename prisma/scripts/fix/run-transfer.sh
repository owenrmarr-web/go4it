#!/bin/bash
# Transfer seed data ownership from admin@go4it.live to owenmarr@umich.edu on all Space Gods apps
FLYCTL="/Users/owenmarr/.fly/bin/flyctl"
SCRIPT="prisma/scripts/fix/transfer.js"

declare -A APP_TABLES
APP_TABLES[go4it-space-gods-inc-cmmdwif2]="Contact,Company,Deal,Activity"
APP_TABLES[go4it-space-gods-inc-cmmdwk90]="Invoice,InvoiceItem,Estimate,EstimateItem,Payment,Client"
APP_TABLES[go4it-space-gods-inc-cmm48cog]="Project,Task,Milestone"
APP_TABLES[go4it-space-gods-inc-cmmdw3mc]="Ticket,TicketComment,KBArticle,KBCategory"
APP_TABLES[go4it-space-gods-inc-cmmb73i0]="Category,Supplier,Product,PurchaseOrder,PurchaseOrderItem"
APP_TABLES[go4it-space-gods-inc-cmmb9pcf]="Department,EmployeeProfile,Announcement"

declare -A APP_NAMES
APP_NAMES[go4it-space-gods-inc-cmmdwif2]="GoCRM"
APP_NAMES[go4it-space-gods-inc-cmmdwk90]="GoInvoice"
APP_NAMES[go4it-space-gods-inc-cmm48cog]="GoProject"
APP_NAMES[go4it-space-gods-inc-cmmdw3mc]="GoSupport"
APP_NAMES[go4it-space-gods-inc-cmmb73i0]="GoInventory"
APP_NAMES[go4it-space-gods-inc-cmmb9pcf]="GoHR"

for APP_ID in "${!APP_TABLES[@]}"; do
  echo ""
  echo "=== ${APP_NAMES[$APP_ID]} ($APP_ID) ==="

  # Copy script to machine
  echo "$(<$SCRIPT)" | $FLYCTL ssh console -a "$APP_ID" -C "cat > /tmp/transfer.js" 2>/dev/null

  # Run it with TABLES env var
  $FLYCTL ssh console -a "$APP_ID" -C "TABLES=${APP_TABLES[$APP_ID]} node /tmp/transfer.js" 2>&1
done
