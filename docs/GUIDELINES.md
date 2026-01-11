# Help Documentation Guidelines

This document provides guidelines for creating and maintaining help documentation for the Monaghan's system.

## Documentation Standards

### File Structure

All help documentation files should be:
- Located in `docs/help-content/[feature]/[filename].md`
- Written in Markdown format
- Include YAML frontmatter with required metadata
- Use descriptive, kebab-case filenames (e.g., `creating-events.md`, `menu-items.md`)

### Frontmatter Requirements

Every documentation file must include the following frontmatter:

```yaml
---
title: "Document Title"
feature: feature-key
route: /admin/route
keywords:
  - keyword1
  - keyword2
keywords:
  - alias1
  - alias2
relatedFeatures:
  - related-feature1
  - related-feature2
version: 1.0.0
lastUpdated: YYYY-MM-DD
---
```

**Required Fields:**
- `title`: Clear, descriptive title
- `feature`: Feature key (e.g., `events`, `menu`, `specials`)
- `route`: Admin route where this feature is accessed
- `version`: Documentation version (start at 1.0.0)
- `lastUpdated`: Date in YYYY-MM-DD format

**Optional Fields:**
- `keywords`: Array of search keywords
- `aliases`: Alternative names for the feature
- `relatedFeatures`: Related feature keys

### Writing Style

1. **Plain Language**: Write in clear, simple language. Avoid jargon unless necessary.
2. **User-Focused**: Write from the user's perspective. Use "you" instead of "the user."
3. **Action-Oriented**: Use active voice and action verbs.
4. **Concise**: Be brief but complete. Avoid unnecessary words.
5. **Scannable**: Use headings, bullet points, and short paragraphs.

### Content Structure

1. **Introduction**: Brief overview of what the document covers
2. **Main Content**: Organized with clear headings and subheadings
3. **Examples**: Include practical examples where helpful
4. **Next Steps**: Link to related documentation
5. **Related Features**: Cross-reference related help docs

## Screenshot Guidelines

### When to Use Screenshots

Use screenshots to:
- Show complex UI elements that are hard to describe
- Demonstrate step-by-step processes
- Highlight specific features or buttons
- Show before/after states
- Illustrate error messages or warnings

Avoid screenshots for:
- Simple text descriptions
- Concepts that are better explained in words
- Frequently changing UI elements (unless critical)

### Screenshot Standards

#### Resolution and Format
- **Resolution**: Minimum 1920x1080 for full-page screenshots, 1280x720 for UI elements
- **Format**: PNG (preferred) or JPEG
- **File Size**: Optimize images to keep file sizes reasonable (< 500KB when possible)
- **Quality**: High quality, clear and readable text

#### Screenshot Content
- **Focus**: Crop to show only relevant UI elements
- **Annotations**: Use arrows, boxes, or highlights to draw attention to specific elements
- **Privacy**: Blur or redact sensitive information (personal data, API keys, etc.)
- **Consistency**: Use consistent styling for annotations across all screenshots

#### File Naming
- Use descriptive, kebab-case names: `calendar-week-view.png`, `create-event-form.png`
- Include feature prefix: `events-calendar-view.png`
- Include step numbers for multi-step processes: `menu-create-item-step1.png`

#### Storage Location
- Store screenshots in `public/help-screenshots/[feature]/`
- Organize by feature area (e.g., `public/help-screenshots/events/`, `public/help-screenshots/menu/`)
- Reference in markdown using relative paths: `![Alt text](../public/help-screenshots/events/calendar-view.png)`

#### Markdown Usage
```markdown
![Calendar Week View](../../public/help-screenshots/events/calendar-week-view.png)

*Figure 1: The calendar week view showing events, specials, and announcements*
```

### Screenshot Maintenance

1. **Update Frequency**: Update screenshots when UI changes significantly
2. **Version Control**: Keep old screenshots if documenting version differences
3. **Review Process**: Review screenshots during documentation review
4. **Accessibility**: Always include descriptive alt text for screen readers

## Video Guidelines

### When to Use Videos

Use videos for:
- Complex multi-step workflows
- Demonstrating interactions (drag-and-drop, animations)
- Tutorials that benefit from visual demonstration
- Features that are difficult to explain with text/screenshots

### Video Standards

#### Technical Specifications
- **Resolution**: Minimum 1920x1080 (1080p)
- **Frame Rate**: 30fps minimum
- **Format**: MP4 (H.264 codec preferred)
- **Duration**: Keep videos concise (2-5 minutes for tutorials, 30-60 seconds for quick tips)
- **File Size**: Optimize for web delivery (< 50MB when possible)

#### Video Content
- **Introduction**: Brief intro explaining what the video covers
- **Clear Audio**: Use clear narration or on-screen text
- **Pacing**: Move at a comfortable pace, not too fast
- **Focus**: Stay focused on the topic, avoid unnecessary actions
- **Ending**: Include a brief summary or next steps

#### File Naming
- Use descriptive, kebab-case names: `creating-recurring-events.mp4`
- Include feature prefix: `events-creating-recurring.mp4`

#### Storage Location
- Store videos in `public/help-videos/[feature]/`
- Organize by feature area
- Consider hosting on external platform (YouTube, Vimeo) for larger files

#### Markdown Usage
```markdown
<video width="800" controls>
  <source src="../../public/help-videos/events/creating-recurring-events.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

*Video: How to create recurring events*
```

### Video Maintenance

1. **Update Frequency**: Update videos when workflows change significantly
2. **Version Control**: Archive old videos if documenting version differences
3. **Accessibility**: Provide transcripts or captions for videos
4. **Review Process**: Review videos during documentation review

## Documentation Templates

Use the templates in `docs/templates/` as starting points:

- **Feature Overview Template**: For introducing a feature
- **Step-by-Step Guide Template**: For detailed how-to instructions
- **Troubleshooting Template**: For common issues and solutions
- **API Reference Template**: For developer documentation (if needed)

## Quality Checklist

Before publishing documentation, ensure:

- [ ] All required frontmatter fields are present
- [ ] Content is clear and user-friendly
- [ ] Step-by-step instructions are accurate
- [ ] Screenshots are clear and up-to-date (if used)
- [ ] Links to related documentation work
- [ ] Keywords and aliases are appropriate
- [ ] Examples are relevant and helpful
- [ ] No broken links or references
- [ ] Content matches current feature functionality
- [ ] Accessibility considerations are met (alt text, clear language)

## Maintenance Workflow

1. **When Features Change**: Update documentation immediately
2. **Validation**: Run `npm run validate:docs` before committing
3. **Review**: Have documentation reviewed as part of PR process
4. **Versioning**: Update `lastUpdated` date when making changes
5. **Testing**: Test all links and examples before publishing

## Best Practices

1. **Keep It Simple**: Don't overcomplicate explanations
2. **Be Consistent**: Use consistent terminology and formatting
3. **Think Like a User**: Write for someone who has never used the feature
4. **Provide Context**: Explain why, not just how
5. **Include Examples**: Real-world examples help users understand
6. **Cross-Reference**: Link to related documentation
7. **Stay Current**: Keep documentation in sync with features
8. **Get Feedback**: Ask users for feedback on documentation clarity

## Resources

- **Templates**: `docs/templates/`
- **Existing Docs**: `docs/help-content/`
- **Validation**: Run `npm run validate:docs`
- **Update Suggestions**: Run `npm run suggest:doc-updates`

## Questions?

If you have questions about documentation standards or need help creating documentation, refer to:
- Existing documentation examples in `docs/help-content/`
- Documentation templates in `docs/templates/`
- The help system validation output for guidance

