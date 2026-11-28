<!--
  The Budgify logo's money tree, redrawn as shapes so its parts can move: the
  tree grows in, the leaves rustle and the coins swing from their branches.
  Drawn in the current text colour.
-->
<template>
  <svg viewBox="0 0 200 180" fill="none" aria-hidden="true">
    <g class="tree">
      <!-- Ground and trunk -->
      <path d="M41 176c14-6 36-10 59-10s46 4 61 10z" fill="currentColor" />
      <path d="M87 169c7-20 7-48 2-73h24c-5 25-6 52 1 73z" fill="currentColor" />
      <!-- Branches and leaf stems -->
      <g stroke="currentColor" stroke-linecap="round">
        <path d="M97 106C86 76 52 55 9 53" stroke-width="8" />
        <path d="M97 90C95 62 82 38 63 17" stroke-width="7" />
        <path d="M99 94C94 60 108 32 139 25" stroke-width="8" />
        <path d="M104 112C117 88 152 74 192 74" stroke-width="8" />
        <path d="M92 62c-4-8-9-13-17-15M82 44c-3-5-3-9-2-13M149 80c0-3 1-5 2-7" stroke-width="5" />
      </g>
    </g>

    <!-- Leaves: each turns about the end of its stem -->
    <g class="leaf leaf-a">
      <path d="M75 47C60 52 42 47 32 31c16-7 34-1 43 16z" stroke="currentColor" stroke-width="5" stroke-linejoin="round" />
    </g>
    <g class="leaf leaf-b">
      <path d="M80 31C79 14 92 3 111 3c-2 17-13 27-31 28z" stroke="currentColor" stroke-width="5" stroke-linejoin="round" />
    </g>
    <g class="leaf leaf-c">
      <path d="M151 73c1-16 14-26 33-25-2 16-15 26-33 25z" stroke="currentColor" stroke-width="5" stroke-linejoin="round" />
    </g>

    <!-- Coins: each swings from the point where its string meets a branch -->
    <g class="coin coin-a">
      <path d="M30 57V66" stroke="currentColor" stroke-width="4" />
      <circle cx="30" cy="86" r="20" stroke="currentColor" stroke-width="5" />
      <text x="30" y="95" text-anchor="middle" fill="currentColor" font-size="26" font-weight="800">$</text>
    </g>
    <g class="coin coin-b">
      <path d="M129 31V41" stroke="currentColor" stroke-width="4" />
      <circle cx="129" cy="58" r="17" stroke="currentColor" stroke-width="5" />
      <text x="129" y="66" text-anchor="middle" fill="currentColor" font-size="22" font-weight="800">$</text>
    </g>
    <g class="coin coin-c">
      <path d="M166 76V87" stroke="currentColor" stroke-width="4" />
      <circle cx="166" cy="108" r="21" stroke="currentColor" stroke-width="5" />
      <text x="166" y="118" text-anchor="middle" fill="currentColor" font-size="27" font-weight="800">$</text>
    </g>
  </svg>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .tree {
    transform-origin: 100px 176px;
    animation: grow 0.7s cubic-bezier(0.3, 1.4, 0.6, 1) both;
  }

  .leaf {
    animation:
      appear 0.4s 0.5s ease-out both,
      rustle 4.2s 0.9s ease-in-out infinite;
  }

  .leaf-a { transform-origin: 75px 47px; }
  .leaf-b { transform-origin: 80px 31px; animation-delay: 0.6s, 1.7s; }
  .leaf-c { transform-origin: 151px 73px; animation-delay: 0.7s, 2.5s; }

  .coin {
    animation:
      appear 0.4s 0.6s ease-out both,
      swing 3.2s ease-in-out infinite alternate;
  }

  .coin-a { transform-origin: 30px 57px; }
  .coin-b { transform-origin: 129px 31px; animation-duration: 0.4s, 2.6s; animation-delay: 0.75s, -1.1s; }
  .coin-c { transform-origin: 166px 76px; animation-duration: 0.4s, 3.7s; animation-delay: 0.9s, -2.3s; }
}

@keyframes grow {
  from { opacity: 0; transform: scale(0.6, 0.3); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes appear {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rustle {
  0%, 60%, 100% { transform: rotate(0deg); }
  70% { transform: rotate(7deg); }
  80% { transform: rotate(-4deg); }
  90% { transform: rotate(2deg); }
}

@keyframes swing {
  from { transform: rotate(7deg); }
  to { transform: rotate(-7deg); }
}
</style>
