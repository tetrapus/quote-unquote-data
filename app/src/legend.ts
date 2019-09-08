import { ZoneColors, ZoneLabels } from "./ZoneTypes";

function shadeColor(color, percent) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);

  R = Math.floor((R * (100 + percent)) / 100);
  G = Math.floor((G * (100 + percent)) / 100);
  B = Math.floor((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);
  console.log(RR, GG, BB);

  return "#" + RR + GG + BB;
}

export const initialise = () => {
  const parent = document.querySelector("#legend");
  const template = document.querySelector("#legend-entry-template");
  parent.innerHTML = template.outerHTML;
  for (const zone in ZoneColors) {
    template.querySelector("[data-target=label]").textContent =
      ZoneLabels[zone];
    (template.querySelector(
      "[data-target=cube-top]"
    ) as HTMLElement).style.fill = ZoneColors[zone];
    (template.querySelector(
      "[data-target=cube-left]"
    ) as HTMLElement).style.fill = shadeColor(ZoneColors[zone], -15);
    (template.querySelector(
      "[data-target=cube-right]"
    ) as HTMLElement).style.fill = shadeColor(ZoneColors[zone], -30);
    parent.innerHTML += `<div class="key-entry">${template.innerHTML}</div>`;
  }
};