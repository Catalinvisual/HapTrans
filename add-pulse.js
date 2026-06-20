const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/components/HowItWorksSection/HowItWorksSection.module.css');
let css = fs.readFileSync(file, 'utf8');

const keyframes = `
@keyframes sequentialPulse {
  0% {
    border-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 0 rgba(255, 90, 0, 0);
  }
  15% {
    border-color: rgba(255, 90, 0, 0.5);
    box-shadow: 0 10px 30px -10px rgba(255, 90, 0, 0.4);
    transform: translateY(-5px);
  }
  30% {
    border-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 0 rgba(255, 90, 0, 0);
    transform: translateY(0);
  }
  100% {
    border-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 0 rgba(255, 90, 0, 0);
    transform: translateY(0);
  }
}
`;

css = css + keyframes;

const animationStyles = `
  animation: sequentialPulse 5s infinite ease-in-out;
`;

css = css.replace('.card {', `.card {\n${animationStyles}`);

const delays = `
.card:nth-child(1) { animation-delay: 0s; }
.card:nth-child(2) { animation-delay: 1s; }
.card:nth-child(3) { animation-delay: 2s; }
.card:nth-child(4) { animation-delay: 3s; }
.card:nth-child(5) { animation-delay: 4s; }

.card:hover {
  animation: none;
`;

css = css.replace('.card:hover {', delays);

fs.writeFileSync(file, css);
console.log("Added sequential pulse animation");
