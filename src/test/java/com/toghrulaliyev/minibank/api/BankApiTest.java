package com.toghrulaliyev.minibank.api;

import com.toghrulaliyev.minibank.TestcontainersConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** HTTP-level tests: status codes and JSON error format. */
@SpringBootTest
@Import(TestcontainersConfig.class)
class BankApiTest {

    @Autowired
    WebApplicationContext context;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    private static String id(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private ResultActions postJson(String url, String body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private void createAccount(String id, String balance) throws Exception {
        postJson("/api/v1/accounts", "{\"id\":\"" + id + "\",\"initialBalance\":" + balance + "}")
                .andExpect(status().isCreated());
    }

    private static String transferJson(String from, String to, String amount) {
        return "{\"fromId\":\"" + from + "\",\"toId\":\"" + to + "\",\"amount\":" + amount + "}";
    }

    @Test
    void createAccountReturns201() throws Exception {
        String a = id("A");
        postJson("/api/v1/accounts", "{\"id\":\"" + a + "\",\"initialBalance\":1000}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(a))
                .andExpect(jsonPath("$.balance").value(1000.0));
    }

    @Test
    void duplicateAccountReturns409() throws Exception {
        String a = id("A");
        createAccount(a, "10");
        postJson("/api/v1/accounts", "{\"id\":\"" + a + "\",\"initialBalance\":10}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void invalidBodyReturns400() throws Exception {
        postJson("/api/v1/accounts", "{\"id\":\"\",\"initialBalance\":10}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void malformedJsonReturns400NotServerError() throws Exception {
        postJson("/api/v1/transfers", "{ \"fromId\": \"A\", \"toId\": ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_JSON"));
    }

    @Test
    void unknownRouteReturns404() throws Exception {
        mvc.perform(get("/this-route-does-not-exist"))
                .andExpect(status().isNotFound());
    }

    @Test
    void wrongHttpMethodReturns405() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/transfers/x"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void nonNumericPageReturns400() throws Exception {
        String a = id("A");
        createAccount(a, "10");
        mvc.perform(get("/api/v1/accounts/" + a + "/transfers").param("page", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void pageSizeTooLargeReturns400() throws Exception {
        mvc.perform(get("/api/v1/accounts").param("size", "500"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void unknownAccountReturns404() throws Exception {
        mvc.perform(get("/api/v1/accounts/" + id("NOPE")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void transferAndHistory() throws Exception {
        String a = id("A"), b = id("B");
        createAccount(a, "100");
        createAccount(b, "0.50");

        postJson("/api/v1/transfers", transferJson(a, b, "25.50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fromBalanceAfter").value(74.5))
                .andExpect(jsonPath("$.toBalanceAfter").value(26.0));

        mvc.perform(get("/api/v1/accounts/" + a + "/transfers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].type").value("TRANSFER"));
    }

    @Test
    void insufficientFundsReturns422() throws Exception {
        String a = id("A"), b = id("B");
        createAccount(a, "10");
        createAccount(b, "10");
        postJson("/api/v1/transfers", transferJson(a, b, "999"))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void reusedIdempotencyKeyWithDifferentAmountReturns409() throws Exception {
        String a = id("A"), b = id("B"), key = id("key");
        createAccount(a, "100");
        createAccount(b, "10");

        mvc.perform(post("/api/v1/transfers").header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(transferJson(a, b, "10")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/transfers").header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(transferJson(a, b, "50")))
                .andExpect(status().isConflict());
    }

    @Test
    void depositAndWithdraw() throws Exception {
        String a = id("A");
        createAccount(a, "100");
        postJson("/api/v1/accounts/" + a + "/deposit", "{\"amount\":50}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceAfter").value(150.0));
        postJson("/api/v1/accounts/" + a + "/withdraw", "{\"amount\":30}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balanceAfter").value(120.0));
    }

    @Test
    void listAccounts() throws Exception {
        createAccount(id("A"), "1");
        mvc.perform(get("/api/v1/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void swaggerDocsAreServed() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("MiniBank API"));
    }
}
