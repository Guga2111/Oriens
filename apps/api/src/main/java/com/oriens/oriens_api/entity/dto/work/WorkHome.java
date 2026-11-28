package com.oriens.oriens_api.entity.dto.work;

import com.oriens.oriens_api.entity.WorkQuickLink;
import java.time.Instant;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.exc.InvalidFormatException;

public final class WorkHome {
    private WorkHome() {}
    public static final class StrictText extends ValueDeserializer<String> {
        @Override public String deserialize(JsonParser parser, DeserializationContext context) {
            if (!parser.hasToken(JsonToken.VALUE_STRING))
                throw InvalidFormatException.from(parser, "Informe um texto.", parser.getValueAsString(), String.class);
            return parser.getString();
        }
    }
    public enum ResourceType { TASK, PROJECT }
    public record LinkInput(@JsonDeserialize(using = StrictText.class) String name, @JsonDeserialize(using = StrictText.class) String url) {}
    public record VisitInput(ResourceType type, Long resourceId) {}
    public record LinkView(long id, String name, String url, Instant createdAt, long version) {
        public static LinkView of(WorkQuickLink link) {
            return new LinkView(link.getId(), link.getName(), link.getUrl(), link.getCreatedAt(), link.getVersion());
        }
    }
    public record RecentView(String type, Long resourceId, String title, Instant visitedAt, String imageUrl) {}
}
