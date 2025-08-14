#!/bin/bash
cd /home/kavia/workspace/code-generation/kavia-investor-data-portal-122751-122760/company_data_room_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

