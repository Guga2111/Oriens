package com.oriens.oriens_api.controller;

import com.fasterxml.jackson.databind.*;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import java.lang.reflect.Type;
import java.io.IOException;

@ControllerAdvice(assignableTypes = {ProjectController.class, TaskController.class, StatisticsController.class})
public class WorkRequestBodyAdvice extends RequestBodyAdviceAdapter {
    private final ObjectMapper strict;
    public WorkRequestBodyAdvice(ObjectMapper mapper) {
        com.fasterxml.jackson.databind.module.SimpleModule dates = new com.fasterxml.jackson.databind.module.SimpleModule();
        dates.addDeserializer(java.time.LocalDate.class, new JsonDeserializer<>() {
            @Override public java.time.LocalDate deserialize(com.fasterxml.jackson.core.JsonParser parser, DeserializationContext context) throws IOException {
                String value = parser.getValueAsString();
                if (!parser.hasToken(com.fasterxml.jackson.core.JsonToken.VALUE_STRING) || value == null || (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || value.startsWith("0000-")))
                    throw com.fasterxml.jackson.databind.exc.InvalidFormatException.from(parser, "Use YYYY-MM-DD", value, java.time.LocalDate.class);
                try { return java.time.LocalDate.parse(value); }
                catch (java.time.DateTimeException e) { throw com.fasterxml.jackson.databind.exc.InvalidFormatException.from(parser, "Invalid date", value, java.time.LocalDate.class); }
            }
        });
        dates.addDeserializer(java.time.LocalTime.class, new JsonDeserializer<>() {
            @Override public java.time.LocalTime deserialize(com.fasterxml.jackson.core.JsonParser parser, DeserializationContext context) throws IOException {
                String value = parser.getValueAsString();
                if (!parser.hasToken(com.fasterxml.jackson.core.JsonToken.VALUE_STRING) || value == null || !value.matches("[0-9]{2}:[0-9]{2}:[0-9]{2}"))
                    throw com.fasterxml.jackson.databind.exc.InvalidFormatException.from(parser, "Use HH:mm:ss", value, java.time.LocalTime.class);
                try { return java.time.LocalTime.parse(value); }
                catch (java.time.DateTimeException e) { throw com.fasterxml.jackson.databind.exc.InvalidFormatException.from(parser, "Invalid time", value, java.time.LocalTime.class); }
            }
        });
        strict = mapper.copy().registerModule(dates).enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).enable(DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
    }
    @Override public boolean supports(MethodParameter parameter, Type type, Class<? extends HttpMessageConverter<?>> converter) { return true; }
    @Override public HttpInputMessage beforeBodyRead(HttpInputMessage input, MethodParameter parameter, Type type,
            Class<? extends HttpMessageConverter<?>> converter) throws IOException {
        byte[] bytes = input.getBody().readAllBytes();
        try {
            strict.readValue(bytes, strict.constructType(type));
        } catch (IOException e) { throw new HttpMessageNotReadableException("Invalid request body", e, input); }
        return new HttpInputMessage() {
            public java.io.InputStream getBody() { return new java.io.ByteArrayInputStream(bytes); }
            public HttpHeaders getHeaders() { return input.getHeaders(); }
        };
    }
}
