const rightTrimRe = /=$/;
function extractorSvelte() {
  return {
    name: "svelte",
    order: 100,
    extract({ id, extracted }) {
      if (id && id.endsWith(".svelte")) {
        const items = Array.from(extracted);
        items.forEach((r) => {
          if (r.startsWith("class:")) {
            extracted.add(r.slice(6).replace(rightTrimRe, ""));
            extracted.delete(r);
          }
        });
      }
    }
  };
}

export { extractorSvelte as default };
