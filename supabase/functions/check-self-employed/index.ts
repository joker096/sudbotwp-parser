const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { inn } = await req.json();

    if (!inn) {
      throw new Error("ИНН обязателен");
    }

    // Валидация ИНН (12 цифр для физлица)
    if (!/^\d{12}$/.test(inn)) {
      throw new Error("ИНН физлица должен содержать 12 цифр");
    }

    const today = new Date().toISOString().substring(0, 10);
    const url = "https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inn: inn,
        requestDate: today,
      }),
    });

    if (!response.ok) {
      // Попытаемся прочитать тело ошибки как JSON
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.message || `Ошибка API налоговой: статус ${response.status}`;
      console.log("NPD API error:", response.status, errorData);
      // Пробрасываем ошибку с более детальным сообщением
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        inn: inn,
        status: result.status === true,
        message: result.message || "",
        checkedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Убедимся, что логируем ошибку в любом виде
    console.error("Self-employed check error:", error instanceof Error ? error.message : JSON.stringify(error));

    let status = 500;
    let errorMessage = "Произошла внутренняя ошибка сервера.";

    // Более безопасная проверка типа ошибки
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("ИНН обязателен") || error.message.includes("12 цифр")) {
        status = 400;
      } else if ((error as any).status === 422 || error.message.includes("Некорректный ИНН")) {
        status = 422;
      } else if ((error as any).status) {
        status = 502; // Bad Gateway
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
