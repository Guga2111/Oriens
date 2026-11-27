# Estágio de Build
FROM eclipse-temurin:25-jdk-jammy AS build
WORKDIR /workspace/app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src
RUN ./mvnw -B -ntp clean package -DskipTests

# Estágio de Produção
FROM eclipse-temurin:25-jre-jammy
RUN groupadd --gid 10001 oriens \
    && useradd --uid 10001 --gid 10001 --no-create-home oriens \
    && install -d -m 0750 -o 10001 -g 10001 /opt/oriens-uploads
WORKDIR /app
COPY --from=build /workspace/app/target/*.jar app.jar
COPY healthcheck.sh .
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --start-period=330s --retries=6 \
    CMD ["bash", "/app/healthcheck.sh"]
ENTRYPOINT ["java", "-jar", "app.jar"]
