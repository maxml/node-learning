# Demonstrates three ways a secret survives in an image even when it "looks" gone.
# All values are FAKE.
FROM busybox:1.36

# (1) secret as build ARG -> ends up in `docker history` of the build step
ARG API_KEY=fake-ARG-key-1111

# (2) secret baked as ENV -> visible via `docker inspect` and `docker history`
ENV DB_PASSWORD=fake-ENV-password-2222

# (3) COPY a .env then delete it in a later layer. The delete is a NEW layer;
#     the file still lives in the earlier COPY layer.
COPY .env /app/.env
RUN echo "used $API_KEY" > /app/build.log && rm /app/.env

CMD ["sh", "-c", "echo running; sleep 1"]
