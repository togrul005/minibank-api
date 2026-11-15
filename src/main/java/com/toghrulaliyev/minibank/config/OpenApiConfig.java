package com.toghrulaliyev.minibank.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Title and description shown in Swagger UI (/swagger-ui.html). */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI miniBankOpenApi() {
        return new OpenAPI().info(new Info()
                .title("MiniBank API")
                .version("v1")
                .description("Concurrency-safe banking API: accounts, deposits, withdrawals, "
                        + "idempotent transfers and transaction history.")
                .contact(new Contact().name("Toghrul Aliyev").url("https://github.com/togrul005")));
    }
}
