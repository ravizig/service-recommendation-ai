import { useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY
const QUERY_MIN_LENGTH = 10
const QUERY_MAX_LENGTH = 8000
const SERVICE_NAME_MIN_LENGTH = 2
const SERVICE_NAME_MAX_LENGTH = 200
const SERVICE_DESCRIPTION_MIN_LENGTH = 10
const SERVICE_DESCRIPTION_MAX_LENGTH = 8000
const SERVING_TIME_MIN = 1
const SERVING_TIME_MAX = 480

function isMeaningfulQuery(input) {
  const trimmed = input.trim()

  return /[a-zA-Z0-9]/.test(trimmed)
}

function getServiceFormValidationError(form) {
  const name = form.name.trim()
  const nameAr = form.nameAr.trim()
  const description = form.description.trim()
  const merchantID = form.merchantID.trim()
  const servingTimeRaw = form.servingTime.trim()

  if (!name) return 'Name is required.'
  if (name.length < SERVICE_NAME_MIN_LENGTH || name.length > SERVICE_NAME_MAX_LENGTH) {
    return `Name must be between ${SERVICE_NAME_MIN_LENGTH} and ${SERVICE_NAME_MAX_LENGTH} characters.`
  }

  if (nameAr && (nameAr.length < SERVICE_NAME_MIN_LENGTH || nameAr.length > SERVICE_NAME_MAX_LENGTH)) {
    return `Arabic name must be between ${SERVICE_NAME_MIN_LENGTH} and ${SERVICE_NAME_MAX_LENGTH} characters.`
  }

  if (!description) return 'Description is required.'
  if (
    description.length < SERVICE_DESCRIPTION_MIN_LENGTH ||
    description.length > SERVICE_DESCRIPTION_MAX_LENGTH
  ) {
    return `Description must be between ${SERVICE_DESCRIPTION_MIN_LENGTH} and ${SERVICE_DESCRIPTION_MAX_LENGTH} characters.`
  }

  if (!merchantID) return 'Merchant ID is required.'

  if (servingTimeRaw) {
    const servingTime = Number(servingTimeRaw)
    if (!Number.isInteger(servingTime)) {
      return 'Serving time must be a whole number.'
    }
    if (servingTime < SERVING_TIME_MIN || servingTime > SERVING_TIME_MAX) {
      return `Serving time must be between ${SERVING_TIME_MIN} and ${SERVING_TIME_MAX} minutes.`
    }
  }

  return ''
}

function App() {
  const [query, setQuery] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationError, setRecommendationError] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [requestMetadata, setRequestMetadata] = useState(null)

  const [showCreateServiceForm, setShowCreateServiceForm] = useState(false)
  const [isCreatingService, setIsCreatingService] = useState(false)
  const [createServiceError, setCreateServiceError] = useState('')
  const [createServiceSuccess, setCreateServiceSuccess] = useState('')
  const [serviceForm, setServiceForm] = useState({
    name: '',
    nameAr: '',
    description: '',
    servingTime: '',
    merchantID: '',
  })

  const hasRecommendations = useMemo(
    () => Array.isArray(recommendations) && recommendations.length > 0,
    [recommendations],
  )

  const handleRecommendationSubmit = async (event) => {
    event.preventDefault()
    setRecommendationError('')

    if (!query.trim()) {
      setRecommendationError('Please enter a query first.')
      return
    }

    if (!isMeaningfulQuery(query)) {
      setRecommendationError('Please enter a valid query.')
      return
    }

    if (query.trim().length < QUERY_MIN_LENGTH || query.trim().length > QUERY_MAX_LENGTH) {
      setRecommendationError(
        `Query must be between ${QUERY_MIN_LENGTH} and ${QUERY_MAX_LENGTH} characters.`,
      )
      return
    }

    const ageValue = patientAge.trim()
    if (ageValue && (Number(ageValue) < 0 || Number(ageValue) > 150)) {
      setRecommendationError('Please enter a valid age between 0 and 150.')
      return
    }

    setIsLoadingRecommendations(true)
    setRecommendations([])

    try {
      const response = await fetch(`${API_BASE_URL}/recommend-service`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: query.trim(),
          patientAge: ageValue ? Number(ageValue) : undefined,
          metadata: {
            source: 'frontend-web',
            queryLabel: 'query',
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to fetch service listing.')
      }

      setRecommendations(result?.data?.recommendations || [])
      setRequestMetadata(result?.data?.metadata || null)
    } catch (error) {
      setRecommendationError(error.message || 'Request failed.')
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const handleServiceFieldChange = (event) => {
    const { name, value } = event.target
    setServiceForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleCreateService = async (event) => {
    event.preventDefault()
    setCreateServiceError('')
    setCreateServiceSuccess('')

    const formError = getServiceFormValidationError(serviceForm)
    if (formError) {
      setCreateServiceError(formError)
      return
    }

    setIsCreatingService(true)

    try {
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: serviceForm.name.trim(),
          nameAr: serviceForm.nameAr.trim() || undefined,
          description: serviceForm.description.trim(),
          servingTime: serviceForm.servingTime
            ? Number(serviceForm.servingTime)
            : undefined,
          merchantID: serviceForm.merchantID.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to create service.')
      }

      const createdName = result?.data?.service?.name || serviceForm.name.trim()
      setCreateServiceSuccess(`Service created successfully: ${createdName}`)
      setServiceForm({
        name: '',
        nameAr: '',
        description: '',
        servingTime: '',
        merchantID: '',
      })
    } catch (error) {
      setCreateServiceError(error.message || 'Service creation failed.')
    } finally {
      setIsCreatingService(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>AI Service Recommendation</h1>
        <p>Enter your query and age to get service listing recommendations.</p>
      </header>

      <section className="panel">
        <h2>Get Service Listing</h2>
        <form className="form-grid" onSubmit={handleRecommendationSubmit}>
          <label className="field">
            Query
            <textarea
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: I have chest pain and shortness of breath"
              rows={4}
              minLength={QUERY_MIN_LENGTH}
              maxLength={QUERY_MAX_LENGTH}
            />
          </label>

          <label className="field">
            Age
            <input
              type="number"
              min="0"
              max="150"
              value={patientAge}
              onChange={(event) => setPatientAge(event.target.value)}
              placeholder="Optional"
            />
          </label>

          <button type="submit" className="button primary" disabled={isLoadingRecommendations}>
            {isLoadingRecommendations ? 'Loading...' : 'Get Service Listing'}
          </button>
        </form>

        {recommendationError ? <p className="status error">{recommendationError}</p> : null}

        {hasRecommendations ? (
          <div className="listing-grid">
            {recommendations.map((service, index) => (
              <article key={service.serviceId || `${service.serviceName}-${index}`} className="listing-card">
                <h3>{service.serviceName || 'Unnamed Service'}</h3>
                <p>{service.serviceDescription || 'No description available.'}</p>
                <div className="listing-meta">
                  <span>Priority: {service.priority || 'N/A'}</span>
                  <span>Confidence: {Math.round((service.confidence || 0) * 100)}%</span>
                  <span>Wait: {service.servingTime || 'N/A'} minutes</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!hasRecommendations && requestMetadata && !recommendationError ? (
          <p className="status info">No services matched this query. Please refine your query.</p>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-actions">
          <h2>Create Service</h2>
          <button
            type="button"
            className="button secondary"
            onClick={() => setShowCreateServiceForm((current) => !current)}
          >
            {showCreateServiceForm ? 'Hide Form' : 'Create Service'}
          </button>
        </div>

        {showCreateServiceForm ? (
          <form className="form-grid" onSubmit={handleCreateService}>
            <label className="field">
              Name
              <input
                name="name"
                value={serviceForm.name}
                onChange={handleServiceFieldChange}
                minLength={SERVICE_NAME_MIN_LENGTH}
                maxLength={SERVICE_NAME_MAX_LENGTH}
                required
              />
            </label>

            <label className="field">
              Arabic Name (Optional)
              <input
                name="nameAr"
                value={serviceForm.nameAr}
                onChange={handleServiceFieldChange}
                minLength={SERVICE_NAME_MIN_LENGTH}
                maxLength={SERVICE_NAME_MAX_LENGTH}
              />
            </label>

            <label className="field field-full">
              Description
              <textarea
                name="description"
                value={serviceForm.description}
                onChange={handleServiceFieldChange}
                rows={4}
                minLength={SERVICE_DESCRIPTION_MIN_LENGTH}
                maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
                required
              />
            </label>

            <label className="field">
              Serving Time (minutes)
              <input
                name="servingTime"
                type="number"
                min={SERVING_TIME_MIN}
                max={SERVING_TIME_MAX}
                value={serviceForm.servingTime}
                onChange={handleServiceFieldChange}
              />
            </label>

            <label className="field">
              Merchant ID
              <input name="merchantID" value={serviceForm.merchantID} onChange={handleServiceFieldChange} required />
            </label>

            <button type="submit" className="button primary" disabled={isCreatingService}>
              {isCreatingService ? 'Creating...' : 'Submit Service'}
            </button>
          </form>
        ) : (
          <p className="status info">Use the Create Service button to add a new service.</p>
        )}

        {createServiceError ? <p className="status error">{createServiceError}</p> : null}
        {createServiceSuccess ? <p className="status success">{createServiceSuccess}</p> : null}
      </section>
    </main>
  )
}

export default App
