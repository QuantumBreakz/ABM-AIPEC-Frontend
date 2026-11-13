import { BrowserRouter } from 'react-router'
import DevGallery from './pages/DevGallery'

// Temporary: FE-0.5 replaces this with the real routes and app shell.
export default function App() {
  return (
    <BrowserRouter>
      <DevGallery />
    </BrowserRouter>
  )
}
