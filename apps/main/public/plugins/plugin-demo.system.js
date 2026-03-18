System.register(['react/jsx-runtime', 'recharts', 'lucide-react', '@nop-chaos/ui', '@nop-chaos/plugin-bridge', 'react-i18next', 'react-router-dom'], (function (exports) {
  'use strict';
  var jsx, jsxs, ResponsiveContainer, AreaChart, CartesianGrid, XAxis, Tooltip, Area, Orbit, UserRound, Blocks, Bell, Compass, Card, CardHeader, CardTitle, Button, CardContent, usePluginNotifications, usePluginUser, usePluginThemeConfig, usePluginManifest, useTranslation, useNavigate, useLocation;
  return {
    setters: [function (module) {
      jsx = module.jsx;
      jsxs = module.jsxs;
    }, function (module) {
      ResponsiveContainer = module.ResponsiveContainer;
      AreaChart = module.AreaChart;
      CartesianGrid = module.CartesianGrid;
      XAxis = module.XAxis;
      Tooltip = module.Tooltip;
      Area = module.Area;
    }, function (module) {
      Orbit = module.Orbit;
      UserRound = module.UserRound;
      Blocks = module.Blocks;
      Bell = module.Bell;
      Compass = module.Compass;
    }, function (module) {
      Card = module.Card;
      CardHeader = module.CardHeader;
      CardTitle = module.CardTitle;
      Button = module.Button;
      CardContent = module.CardContent;
    }, function (module) {
      usePluginNotifications = module.usePluginNotifications;
      usePluginUser = module.usePluginUser;
      usePluginThemeConfig = module.usePluginThemeConfig;
      usePluginManifest = module.usePluginManifest;
    }, function (module) {
      useTranslation = module.useTranslation;
    }, function (module) {
      useNavigate = module.useNavigate;
      useLocation = module.useLocation;
    }],
    execute: (function () {

      exports("default", PluginDemo);

      function PluginDemo() {
        const { t, i18n } = useTranslation();
        const navigate = useNavigate();
        const location = useLocation();
        const notifications = usePluginNotifications();
        const user = usePluginUser();
        const theme = usePluginThemeConfig();
        const manifest = usePluginManifest("plugins-demo");
        const currentPath = location.pathname;
        const title = String(manifest?.settings?.reportTitle ?? t("plugins.defaultReportTitle"));
        const threshold = Number(manifest?.settings?.highlightThreshold ?? 85);
        const reportData = [
          { label: t("plugins.weekdays.mon"), reports: 16 },
          { label: t("plugins.weekdays.tue"), reports: 21 },
          { label: t("plugins.weekdays.wed"), reports: 19 },
          { label: t("plugins.weekdays.thu"), reports: 25 },
          { label: t("plugins.weekdays.fri"), reports: 28 },
          { label: t("plugins.weekdays.sat"), reports: 24 },
          { label: t("plugins.weekdays.sun"), reports: 30 }
        ];
        const kpiCards = [
          { label: t("plugins.title"), value: `${theme.themeId} / ${theme.displayMode}`, icon: /* @__PURE__ */ jsx(Orbit, { className: "size-4" }) },
          { label: t("plugins.currentUser"), value: user?.nickname ?? user?.username ?? t("common.guest"), icon: /* @__PURE__ */ jsx(UserRound, { className: "size-4" }) },
          { label: t("plugins.currentLanguage"), value: i18n.language, icon: /* @__PURE__ */ jsx(Blocks, { className: "size-4" }) },
          { label: t("plugins.highlightThreshold"), value: `${threshold}%`, icon: /* @__PURE__ */ jsx(Blocks, { className: "size-4" }) }
        ];
        return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs(Card, { className: "theme-card overflow-hidden", children: [
            /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "eyebrow-text tracking-[0.22em]", children: t("plugins.remotePluginEyebrow") }),
                /* @__PURE__ */ jsx(CardTitle, { className: "mt-3", children: title }),
                /* @__PURE__ */ jsx("div", { className: "mt-2 text-sm text-muted-foreground", children: t("plugins.placeholder") })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsxs(
                  Button,
                  {
                    variant: "secondary",
                    onClick: () => notifications.success(t("plugins.hostNotification", { user: user?.nickname ?? user?.username ?? t("common.guest") })),
                    children: [
                      /* @__PURE__ */ jsx(Bell, { className: "size-4" }),
                      t("plugins.notifyHost")
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => navigate("/plugins/management"), children: [
                  /* @__PURE__ */ jsx(Compass, { className: "size-4" }),
                  t("plugins.managementTitle")
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(CardContent, { className: "grid gap-4 md:grid-cols-3", children: kpiCards.map((item) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 text-sm backdrop-blur-xl dark:bg-slate-900/35", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 text-muted-foreground", children: [
                /* @__PURE__ */ jsx("span", { children: item.label }),
                item.icon
              ] }),
              /* @__PURE__ */ jsx("div", { className: "mt-4 text-lg font-semibold text-foreground", children: item.value })
            ] }, item.label)) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { className: "theme-card overflow-hidden", children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: t("plugins.analyticsTitle") }) }),
            /* @__PURE__ */ jsxs(CardContent, { className: "grid gap-4 lg:grid-cols-[1.3fr_0.7fr]", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  "data-testid": "plugin-analytics-chart",
                  className: "h-[20rem] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white/35 p-3 dark:bg-slate-900/35",
                  children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(AreaChart, { data: reportData, margin: { top: 12, right: 8, left: 0, bottom: 0 }, children: [
                    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "pluginReports", x1: "0", x2: "0", y1: "0", y2: "1", children: [
                      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "hsl(var(--primary))", stopOpacity: 0.72 }),
                      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "hsl(var(--primary))", stopOpacity: 0.08 })
                    ] }) }),
                    /* @__PURE__ */ jsx(CartesianGrid, { stroke: "hsl(var(--border))", vertical: false }),
                    /* @__PURE__ */ jsx(XAxis, { dataKey: "label", tickLine: false, axisLine: false }),
                    /* @__PURE__ */ jsx(
                      Tooltip,
                      {
                        contentStyle: {
                          borderRadius: 18,
                          border: "1px solid hsl(var(--border))",
                          background: "var(--card-surface)"
                        }
                      }
                    ),
                    /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "reports", stroke: "hsl(var(--primary))", fill: "url(#pluginReports)", strokeWidth: 3 })
                  ] }) })
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: [
                { label: t("plugins.weekdays.mon"), value: t("plugins.reportCount", { count: 16 }) },
                { label: t("plugins.weekdays.thu"), value: t("plugins.reportCount", { count: 25 }) },
                { label: t("plugins.weekdays.sun"), value: t("plugins.reportCount", { count: 30 }) }
              ].map((item) => /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/35", children: [
                /* @__PURE__ */ jsx("div", { className: "eyebrow-text text-muted-foreground", children: item.label }),
                /* @__PURE__ */ jsx("div", { className: "mt-2 text-lg font-semibold text-foreground", children: item.value })
              ] }, item.label)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Card, { className: "theme-card overflow-hidden", children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: t("plugins.bridgeTitle") }) }),
            /* @__PURE__ */ jsxs(CardContent, { className: "grid gap-4 md:grid-cols-[1fr_0.9fr] text-sm text-muted-foreground", children: [
              /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 backdrop-blur-xl dark:bg-slate-900/35", children: t("plugins.bridgeDescription") }),
              /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-dashed border-[hsl(var(--border))] p-5", children: t("plugins.bridgeState", {
                theme: theme?.themeId ?? "classic",
                user: user?.username ?? t("common.guestLowercase"),
                language: i18n.language,
                path: currentPath,
                status: manifest?.enabled ? t("common.enabledLowercase") : t("common.disabledLowercase")
              }) })
            ] })
          ] })
        ] });
      }

    })
  };
}));
//# sourceMappingURL=plugin-demo.system.js.map
