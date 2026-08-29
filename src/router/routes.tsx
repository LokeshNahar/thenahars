import { Route, Routes } from 'react-router-dom'
import { AboutPage } from '../pages/AboutPage'
import { DirectoryPage } from '../pages/DirectoryPage'
import { FamilyTreePage } from '../pages/FamilyTreePage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PersonDetailPage } from '../pages/PersonDetailPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tree" element={<FamilyTreePage />} />
      <Route path="/directory" element={<DirectoryPage />} />
      <Route path="/person/:naharId" element={<PersonDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
