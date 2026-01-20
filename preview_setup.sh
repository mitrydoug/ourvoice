echo "COMPOSE_PROFILES=preview" > .env
PR_TAG=$(echo "$PULLPREVIEW_URL" | sed -E 's/https?:\/\/(pr-[0-9]+).*/\1/')
echo "PR_TAG=$PR_TAG" >> .env
