if (window.location.pathname === "/watch" || window.location.pathname.startsWith("/watch/")) {
  document.title = "Deadline Playtest Watch";
  import("./watch.js");
} else if (window.location.pathname === "/test" || window.location.pathname.startsWith("/test/")) {
  document.title = "Deadline Engine Inspector";
  import("./testbench.js");
} else {
  import("./main.js");
}
