import { useState, useEffect } from 'react';
import { X, Upload, User, Loader2 } from 'lucide-react';
import { Lawyer } from '../types';

export default function LawyerModal({
  lawyer,
  onSave,
  onClose,
}: {
  lawyer: Lawyer | null;
  onSave: (lawyerData: Partial<Lawyer>, file?: File) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(lawyer?.name || '');
  const [specialization, setSpecialization] = useState(lawyer?.specialization || '');
  const [city, setCity] = useState(lawyer?.city || '');
  const [region, setRegion] = useState(lawyer?.region || '');
  const [phone, setPhone] = useState(lawyer?.phone || '');
  const [email, setEmail] = useState(lawyer?.email || '');
  const [website, setWebsite] = useState(lawyer?.website || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [experience, setExperience] = useState(lawyer?.experience || '');
  const [experienceYears, setExperienceYears] = useState(lawyer?.experience_years || 0);
  const [description, setDescription] = useState(lawyer?.description || '');
  const [licenseNumber, setLicenseNumber] = useState(lawyer?.license_number || '');
  const [practiceAreas, setPracticeAreas] = useState(lawyer?.practice_areas?.join(', ') || '');
  const [languages, setLanguages] = useState(lawyer?.languages?.join(', ') || '');
  const [isActive, setIsActive] = useState(lawyer?.is_active ?? true);
  const [verified, setVerified] = useState(lawyer?.verified ?? false);
  const [isFeatured, setIsFeatured] = useState(lawyer?.is_featured ?? false);
    const [telegram, setTelegram] = useState(lawyer?.telegram || "");
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium' | 'featured'>(lawyer?.subscription_tier || 'free');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (lawyer) {
      setName(lawyer.name || '');
      setSpecialization(lawyer.specialization || '');
      setCity(lawyer.city || '');
      setRegion(lawyer.region || '');
      setPhone(lawyer.phone || '');
      setEmail(lawyer.email || '');
      setWebsite(lawyer.website || '');
      setExperience(lawyer.experience || '');
      setExperienceYears(lawyer.experience_years || 0);
      setDescription(lawyer.description || '');
      setLicenseNumber(lawyer.license_number || '');
      setIsActive(lawyer.is_active ?? true);
      setVerified(lawyer.verified ?? false);
      setIsFeatured(lawyer.is_featured ?? false);
      setSubscriptionTier(lawyer.subscription_tier || 'free');
      setTelegram(lawyer.telegram || "");
      setPracticeAreas(lawyer.practice_areas?.join(', ') || '');
      setLanguages(lawyer.languages?.join(', ') || '');
      setPhotoFile(null);
    }
  }, [lawyer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUploading(true);

    const practiceAreasArray = practiceAreas
      ? practiceAreas.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const languagesArray = languages
      ? languages.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    onSave(
      {
        name: name.trim(),
        specialization,
        city,
        region,
        phone,
        email,
        website,
        experience,
        experience_years: experienceYears,
        description,
        license_number: licenseNumber || undefined,
        practice_areas: practiceAreasArray,
        languages: languagesArray,
        is_active: isActive,
        verified,
        is_featured: isFeatured,
        subscription_tier: subscriptionTier,
        telegram,
      },
      photoFile || undefined
    );
    setIsUploading(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {lawyer ? 'Редактировать юриста' : 'Добавить юриста'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Фото</label>
            <div className="flex items-center gap-3">
              {lawyer?.avatar_url || lawyer?.photo_url ? (
                <img
                  src={lawyer.avatar_url || lawyer.photo_url}
                  alt="Current photo"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-2 flex-1 text-center">
                <input
                  type="file"
                  id="lawyer-photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label htmlFor="lawyer-photo" className="cursor-pointer text-xs text-slate-500">
                  {photoFile ? photoFile.name : 'Выберите фото'}
                </label>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Имя *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Специализация</label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Семельное право"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* City & Region */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Город</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Регион</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Московская область"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Телефон</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 999 123 45 67"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lawyer@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Веб-сайт</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Experience */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Опыт (текст)</label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="10 лет"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Опыт (годы)</label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                placeholder="10"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          {/* License number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Номер лицензии</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Лиценсия №..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Practice Areas & Languages */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Сферы практики (через запятую)</label>
              <input
                type="text"
                value={practiceAreas}
                onChange={(e) => setPracticeAreas(e.target.value)}
                placeholder="Семельное право, Уголовное право"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Язы (через запятую)</label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Русский, Английский"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Telegram */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telegram</label>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {/* Subscription tier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Тариф</label>
            <select
              value={subscriptionTier}
              onChange={(e) => setSubscriptionTier(e.target.value as 'free' | 'basic' | 'premium' | 'featured')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="featured">Featured</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Активен</span>
              <button type="button" onClick={() => setIsActive(!isActive)}>
                {isActive ? (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-accent">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="22" cy="10" r="6" fill="white" />
                  </svg>
                ) : (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-slate-400">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="8" cy="10" r="6" fill="white" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Верифицирован</span>
              <button type="button" onClick={() => setVerified(!verified)}>
                {verified ? (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-green-500">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="22" cy="10" r="6" fill="white" />
                  </svg>
                ) : (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-slate-400">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="8" cy="10" r="6" fill="white" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Рекомендуемый</span>
              <button type="button" onClick={() => setIsFeatured(!isFeatured)}>
                {isFeatured ? (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-amber-500">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="22" cy="10" r="6" fill="white" />
                  </svg>
                ) : (
                  <svg width="32" height="20" viewBox="0 0 32 20" className="text-slate-400">
                    <rect width="32" height="20" rx="10" fill="currentColor" />
                    <circle cx="8" cy="10" r="6" fill="white" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-light transition-all disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (lawyer ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
