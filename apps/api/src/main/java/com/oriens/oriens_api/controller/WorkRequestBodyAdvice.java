package com.oriens.oriens_api.controller;

import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.exc.InvalidFormatException;
import tools.jackson.core.JsonParser;
import com.oriens.oriens_api.entity.dto.work.PatchProject;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.*;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import java.lang.reflect.Type;
import java.io.IOException;

@ControllerAdvice(assignableTypes = {com.oriens.oriens_api.mcp.McpController.class, FinancialEntryController.class, InvestmentController.class, WorkHomeController.class, ProjectController.class, TaskController.class, TaskLabelController.class, StatisticsController.class})
public class WorkRequestBodyAdvice extends RequestBodyAdviceAdapter {
    private final ObjectMapper strict;
    public WorkRequestBodyAdvice(ObjectMapper mapper) {
        SimpleModule dates = new SimpleModule();
        dates.addDeserializer(java.time.LocalDate.class, new ValueDeserializer<>() {
            @Override public java.time.LocalDate deserialize(JsonParser parser, DeserializationContext context) {
                String value = parser.getValueAsString();
                if (!parser.hasToken(JsonToken.VALUE_STRING) || value == null || (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || value.startsWith("0000-")))
                    throw InvalidFormatException.from(parser, "Use YYYY-MM-DD", value, java.time.LocalDate.class);
                try { return java.time.LocalDate.parse(value); }
                catch (java.time.DateTimeException e) { throw InvalidFormatException.from(parser, "Invalid date", value, java.time.LocalDate.class); }
            }
        });
        dates.addDeserializer(java.time.LocalTime.class, new ValueDeserializer<>() {
            @Override public java.time.LocalTime deserialize(JsonParser parser, DeserializationContext context) {
                String value = parser.getValueAsString();
                if (!parser.hasToken(JsonToken.VALUE_STRING) || value == null || !value.matches("[0-9]{2}:[0-9]{2}:[0-9]{2}"))
                    throw InvalidFormatException.from(parser, "Use HH:mm:ss", value, java.time.LocalTime.class);
                try { return java.time.LocalTime.parse(value); }
                catch (java.time.DateTimeException e) { throw InvalidFormatException.from(parser, "Invalid time", value, java.time.LocalTime.class); }
            }
        });
        strict = mapper.rebuild().addModule(dates).enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).enable(EnumFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    }
    @Override public boolean supports(MethodParameter parameter, Type type, Class<? extends HttpMessageConverter<?>> converter) { return true; }
    @Override public HttpInputMessage beforeBodyRead(HttpInputMessage input, MethodParameter parameter, Type type,
            Class<? extends HttpMessageConverter<?>> converter) throws IOException {
        boolean bounded = parameter.getDeclaringClass() == com.oriens.oriens_api.mcp.McpController.class
            || parameter.getDeclaringClass() == TaskController.class
            || parameter.getParameterType() == PatchProject.class;
        byte[] bytes = bounded ? input.getBody().readNBytes(262145) : input.getBody().readAllBytes();
        if (bounded && bytes.length > 262144)
            throw new com.oriens.oriens_api.exception.WorkDomainException("PAYLOAD_TOO_LARGE", null, "A solicitação excede 256 KiB.");
        try {
            strict.readValue(bytes, strict.constructType(type));
        } catch (JacksonException e) { throw new HttpMessageNotReadableException("Invalid request body", e, input); }
        return new HttpInputMessage() {
            public java.io.InputStream getBody() { return new java.io.ByteArrayInputStream(bytes); }
            public HttpHeaders getHeaders() { return input.getHeaders(); }
        };
    }
}
