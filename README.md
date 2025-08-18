# Tadabbur AI - Frontend

Web application for reading the Quran with Tadabbur (تدبر).

As Allah said: `أَفَلَا يَتَدَبَّرُ‌ونَ الْقُرْ‌آنَ | Do they not then reflect on the Quran?` ( Surah Nisa - verse 82 ). 

Reflecting over the Quran is what is called Tadabbur. 
And this app aims to make that process easier and more engaging.

## What This Project Is About

Tadabbur AI is a spiritual companion app that combines traditional Islamic study with modern AI technology. Users can:
- Browse and read all 114 Surahs of the Quran
- Get AI-powered spiritual reflections on verses
- Take markdown notes during their study
- Chat with an Islamic AI assistant
- Have a clean, distraction-free reading experience

## 🚀 Quick Start

### Prerequisites
Make sure you have these installed:
- **Node.js** (version 18 or higher)
- **npm** or **yarn**

### Getting Started
```bash
# Clone the repository
git clone https://github.com/Tadabur-AI/Tadabbur-AI-Web.git
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Open your browser to http://localhost:5173
```

### Available Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check code quality
```

## 📁 Project Structure - What Goes Where

Here's how the project is organized and what each folder does:

```
frontend/
├── public/                 # Static files (fonts, images, icons)
│   ├── fonts/             # Custom fonts (Google Sans, Amiri Quran)
│   └── images/            # Background images and assets
├── src/
│   ├── components/        # Reusable UI components
│   │   └── common/        # Shared components (logos, etc.)
│   ├── css/               # Global styles
│   │   ├── root.css       # Font definitions and base styles
│   │   └── tailwind.css   # Tailwind configuration with custom colors
│   ├── layouts/           # Page layout components
│   │   ├── AuthLayout.tsx        # Split-screen login layout
│   │   ├── DashboardLayout.tsx   # Main app layout with sidebar
│   │   └── ReadSurahLayout.tsx   # Special layout for reading Quran
│   ├── pages/             # All page components
│   │   ├── authentication/       # Login/signup pages
│   │   ├── chat/                 # AI chat functionality
│   │   ├── homepage/             # Dashboard/home page
│   │   ├── notes/                # Note-taking feature
│   │   ├── surahs/               # Quran reading pages
│   │   └── index.ts              # Export all pages
│   ├── routing/           # Navigation setup
│   │   ├── public/               # Routes anyone can access
│   │   ├── private/              # Routes requiring authentication
│   │   └── router.tsx            # Main router configuration
│   ├── types/             # TypeScript type definitions
│   └── main.tsx           # App entry point
├── package.json           # Dependencies and scripts
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite build tool configuration
```

## 🎨 Design System & Styling

### Color Scheme
We use a Islamic-inspired color palette:
- **Primary Green**: `#1f620a` - Main brand color
- **Secondary Blue**: `#3c6382` - Complementary actions
- **Golden Accent**: `#fad02e` - Highlights and emphasis
- **Background**: `#f8f9fa` - Clean light background
- **Text**: `#2d3436` - Dark readable text

### Typography
- **Primary Font**: Google Sans - Clean, modern reading
- **Arabic Font**: Amiri Quran - Beautiful Arabic text rendering

### Responsive Design
- **Mobile-first approach** with `sm:` breakpoint at 480px
- **Flexible layouts** that work on phones, tablets, and desktops

## 🧩 Key Components Explained

### Layouts
- **`AuthLayout`**: Two-column layout for login/signup pages
- **`DashboardLayout`**: Main app layout with collapsible sidebar, header, and content area
- **`ReadSurahLayout`**: Special layout for Quran reading with verse navigation

### Pages
- **`ListSurahsPage`**: Browse all 114 Surahs of the Quran
- **`ReadSurahPage`**: Read verses with AI-powered reflections
- **`NotesPage`**: Markdown editor with live preview for study notes
- **`ChatPage`**: AI chat for Islamic guidance and questions
- **`AuthenticationPage`**: Login and authentication

### Routing
- **Public Routes**: Accessible without login (Surahs, login page)
- **Private Routes**: Require authentication (notes, chat, profile)
- **Route Protection**: Automatically redirects to login if not authenticated

## 🛠️ Technologies Used

### Core Stack
- **React 19**: Modern UI library with latest features
- **TypeScript**: Type-safe JavaScript for better development
- **Vite**: Fast build tool and development server
- **React Router**: Client-side navigation

### Styling & UI
- **Tailwind CSS 4**: Utility-first CSS framework
- **React Icons**: Beautiful SVG icons
- **Custom CSS Variables**: Consistent theming

### Special Features
- **react-markdown**: Render markdown in notes and chat
- **quran-english**: Package for Quran data and translations
- **remark-gfm**: GitHub-flavored markdown support

## 📚 Key Features & How They Work

### 1. Quran Reading
- Uses `quran-english` package to fetch Surah and verse data
- Displays Arabic text with English translations
- Verse-by-verse navigation
- AI-powered spiritual reflections on demand

### 2. Note Taking
- Markdown editor with live preview
- Local storage for persistence
- Rich text formatting support
- Easy organization and search

### 3. AI Chat
- Streams responses from AI API
- Islamic context and knowledge base
- Real-time typing indicators
- Conversation history

### 4. Authentication
- Route protection system
- Currently set up for future auth integration
- Redirects and state management

## 🎯 Best Practices We Follow

### Code Organization
- **Feature-based folders**: Each page has its own folder
- **Shared components**: Common UI elements in `components/common/`
- **Single responsibility**: Each component does one thing well
- **Type safety**: Everything is typed with TypeScript

### Styling Conventions
- **Utility-first**: Use Tailwind classes directly in components
- **Custom properties**: CSS variables for consistent theming
- **Responsive**: Mobile-first design approach
- **Semantic**: Meaningful class names and structure

### Performance
- **Code splitting**: Automatic with Vite
- **Tree shaking**: Only bundle what you use
- **Optimized builds**: Minification and compression
- **Font optimization**: Local font loading

## ✅ Do's and Don'ts for Contributors

### ✅ DO's
- **Use TypeScript properly** - Define interfaces for all props and data
- **Follow the folder structure** - Put files in the right place
- **Use semantic HTML** - Proper headings, labels, and ARIA attributes
- **Test your changes** - Make sure everything works on mobile and desktop
- **Use the existing color scheme** - Stick to our CSS variables
- **Write meaningful commit messages** - Explain what and why
- **Use Tailwind classes** - Don't write custom CSS unless absolutely necessary

### ❌ DON'Ts
- **Don't hardcode colors** - Use CSS variables like `var(--color-primary)`
- **Don't ignore TypeScript errors** - Fix them, don't use `any`
- **Don't create new layouts** - Use existing ones or discuss first
- **Don't break responsive design** - Test on different screen sizes
- **Don't put business logic in components** - Keep components clean and simple
- **Don't commit node_modules** - It's already in .gitignore
- **Don't use inline styles** - Use Tailwind classes instead

## 🔧 Development Tips

### Adding New Pages
1. Create component in `src/pages/your-feature/`
2. Export it from `src/pages/index.ts`
3. Add route in `src/routing/public/` or `src/routing/private/`
4. Use appropriate layout component

### Working with Styles
```tsx
// Good: Using CSS variables and Tailwind
<div className="bg-primary text-white p-4">

// Bad: Hardcoded colors
<div style={{ backgroundColor: '#1f620a' }}>
```

### TypeScript Best Practices
```tsx
// Good: Proper interface definition
interface Props {
  title: string;
  onClick: () => void;
  children?: React.ReactNode;
}

// Bad: Using any
const MyComponent = (props: any) => {
```

### API Integration
```tsx
// Good: Proper error handling and types
const fetchData = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

## 🤝 How to Contribute

1. **Fork the repository** and create your feature branch
2. **Read this README** thoroughly to understand the structure
3. **Make your changes** following our conventions
4. **Test everything** on different screen sizes
5. **Run the linter** with `npm run lint`
6. **Write clear commit messages**
7. **Submit a pull request** with a description of your changes

## 📝 Common Tasks

### Adding a New Icon
```tsx
import { FiYourIcon } from 'react-icons/fi';

// Use consistently with our icon style
<FiYourIcon className="text-xl" />
```

### Creating a New Page
```tsx
import DashboardLayout from '../../layouts/DashboardLayout';

export default function YourPage() {
  return (
    <DashboardLayout
      sidebarItems={[/* your items */]}
      screenTitle="Your Page"
      userProfile={<div>Profile</div>}
    >
      {/* Your content */}
    </DashboardLayout>
  );
}
```

### Adding New Routes
```tsx
// In public_routes.tsx or private_routes.tsx
<Route element={<YourPage />} path="/your-path" />
```

## 🐛 Troubleshooting

### Common Issues
- **Fonts not loading**: Check paths in `src/css/root.css`
- **TypeScript errors**: Make sure all imports have proper types
- **Styles not applying**: Check if Tailwind classes are correct
- **Routing issues**: Verify route definitions and imports

### Getting Help
- Check the browser console for errors
- Use TypeScript compiler output for type issues
- Test in different browsers and screen sizes
- Ask questions in team discussions

## 📱 Browser Support

This app works on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🏗️ Future Improvements

- **Authentication system**: Complete user login/logout
- **Offline support**: Cache Quran data for offline reading  
- **Theme switching**: Dark/light mode toggle
- **Progressive Web App**: Add PWA features
- **Better search**: Search within Surahs and notes
- **User preferences**: Customize reading experience

---

**Happy coding! 🚀** 

If you have questions or suggestions, feel free to open an issue or start a discussion. This project is built with love for the Islamic community and modern web development practices.
