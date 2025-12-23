// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/main.css'
import './css/root.css'
import './css/tailwind.css'
import { Router } from './routing/router'
import { PlayPleasantlyProvider } from './components/PleasentPlay/PlayPleasantlyProvider'
import { ThemeProvider } from './hooks/useTheme'
// import DownForMaintanance from './components/common/DownForMaintanance'

createRoot(document.getElementById('root')!).render(
  <>
  {/* <StrictMode> */}
    {/* <DownForMaintanance /> */}
    <ThemeProvider>
      <PlayPleasantlyProvider>
        <Router />
      </PlayPleasantlyProvider>
    </ThemeProvider>
  {/* </StrictMode> */}
  </>
  ,
)
