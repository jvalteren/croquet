let url = `${document.location.origin}/lively-socket.io`;
//let url = `https://lively-next.org/lively-socket.io`;
lively.l2l.client = lively.l2l.L2LClient.ensure({
  url, namespace: "l2l",
  info: {
    type: "CEO Cockpit"
  }
});
lively.l2l.client.whenRegistered(20*1000)
  .then(() => console.log("[l2l] online"))
  .catch(err => console.error("[l2l] failed:", err));
