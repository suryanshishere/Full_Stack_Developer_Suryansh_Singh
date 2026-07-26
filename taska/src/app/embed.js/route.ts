import { withErrors } from "@/lib/api";

export const GET = withErrors(async (req) => {
  const origin = new URL(req.url).origin;
  const script = [
    "(function(){",
    "var anchor=document.currentScript;",
    "var frame=document.createElement('iframe');",
    `frame.src='${origin}/capture';`,
    "frame.title='Leadline capture form';",
    "frame.style.width='100%';",
    "frame.style.maxWidth='520px';",
    "frame.style.height='620px';",
    "frame.style.border='0';",
    "frame.style.borderRadius='12px';",
    "frame.style.boxShadow='0 1px 8px rgba(15,15,15,0.1)';",
    "frame.loading='lazy';",
    "anchor.parentNode.insertBefore(frame,anchor);",
    "})();",
  ].join("");
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
