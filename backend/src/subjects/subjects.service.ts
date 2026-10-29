import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subject } from "./subject.entity.js";
import { CreateSubjectDto } from "./dto/create-subject.dto.js";
import { UpdateSubjectDto } from "./dto/update-subject.dto.js";

@Injectable()
export class SubjectsService implements OnModuleInit {
    constructor(
        @InjectRepository(Subject)
        private readonly subjectRepository: Repository<Subject>,
    ) {}

    public async onModuleInit() {
        await this.seedDefaultsIfEmpty();
    }

    public async findAll(filiere?: string) {
        if (filiere && filiere !== 'all') {
            return this.subjectRepository.find({
                where: { filiere },
                order: { name: 'ASC' },
            });
        }
        return this.subjectRepository.find({
            order: { filiere: 'ASC', name: 'ASC' },
        });
    }

    public async findOne(id: number) {
        const subject = await this.subjectRepository.findOne({ where: { id } });
        if (!subject) throw new NotFoundException('Subject not found');
        return subject;
    }

    public async findBySlug(slug: string) {
        const subject = await this.subjectRepository.findOne({ where: { slug } });
        if (!subject) throw new NotFoundException('Subject not found');
        return subject;
    }

    public async getFilieres(): Promise<string[]> {
        const subjects = await this.subjectRepository.find({ select: { filiere: true } });
        const set = new Set(subjects.map((s) => s.filiere));
        // Ensure standard filières are included in suggestions
        [
            '2ème Informatique',
            '2ème Math',
            '2ème Sciences',
            '2ème Économie & Services',
            '3ème Informatique',
            '3ème Math',
            '3ème Sciences Expérimentales',
            'Bac Informatique',
            'Bac Math',
            'Bac Sciences',
            'Tronc Commun',
        ].forEach((f) => set.add(f));
        return Array.from(set);
    }

    public async create(dto: CreateSubjectDto, userId?: number) {
        const generatedSlug = dto.slug || this.slugify(`${dto.filiere}-${dto.code || dto.name}`);
        const existing = await this.subjectRepository.findOne({ where: { slug: generatedSlug } });
        if (existing) {
            throw new BadRequestException(`A subject with code/slug "${generatedSlug}" already exists for this filière.`);
        }

        const subject = this.subjectRepository.create({
            name: dto.name,
            code: dto.code.toUpperCase(),
            slug: generatedSlug,
            filiere: dto.filiere,
            category: dto.category || 'Sciences & Tech',
            description: dto.description || '',
            icon: dto.icon || 'math',
            color: dto.color || '#4f46e5',
            topics: dto.topics || '',
            createdById: userId,
        });

        return this.subjectRepository.save(subject);
    }

    public async update(id: number, dto: UpdateSubjectDto) {
        const subject = await this.findOne(id);
        if (dto.name !== undefined) subject.name = dto.name;
        if (dto.code !== undefined) subject.code = dto.code.toUpperCase();
        if (dto.filiere !== undefined) subject.filiere = dto.filiere;
        if (dto.category !== undefined) subject.category = dto.category;
        if (dto.description !== undefined) subject.description = dto.description;
        if (dto.icon !== undefined) subject.icon = dto.icon;
        if (dto.color !== undefined) subject.color = dto.color;
        if (dto.topics !== undefined) subject.topics = dto.topics;
        if (dto.slug !== undefined) subject.slug = dto.slug;
        return this.subjectRepository.save(subject);
    }

    public async remove(id: number) {
        const subject = await this.findOne(id);
        await this.subjectRepository.remove(subject);
        return { message: 'Subject deleted successfully' };
    }

    private slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private async seedDefaultsIfEmpty() {
        const defaultSubjects: Partial<Subject>[] = [
            // 2ème Informatique
            {
                name: 'Algorithmique & Programmation',
                code: 'ALGO',
                slug: 'algo-2info',
                filiere: '2ème Informatique',
                category: 'Technologies',
                description: 'Algorithmique de base, Python, structures conditionnelles et itératives, tableaux.',
                icon: 'informatique',
                color: '#0284c7',
                topics: 'Python, Algorithmique, Tableaux, Sous-programmes',
            },
            {
                name: 'TIC & Technologies du Web',
                code: 'TIC',
                slug: 'tic-2info',
                filiere: '2ème Informatique',
                category: 'Technologies',
                description: 'HTML5, CSS, bases des réseaux, multimédia et création numérique.',
                icon: 'informatique',
                color: '#0ea5e9',
                topics: 'HTML/CSS, Réseaux, Multimédia',
            },
            {
                name: 'Mathématiques',
                code: 'MATH',
                slug: 'math-2info',
                filiere: '2ème Informatique',
                category: 'Sciences Exactes',
                description: 'Polynômes, fonctions de référence, trigonométrie et géométrie vectorielle.',
                icon: 'math',
                color: '#4f46e5',
                topics: 'Polynômes, Trigonométrie, Fonctions',
            },
            {
                name: 'Physique - Chimie',
                code: 'PHYSIQUE',
                slug: 'physique-2info',
                filiere: '2ème Informatique',
                category: 'Sciences Physiques',
                description: 'Optique, circuits en courant continu, électrostatique et réactions chimiques.',
                icon: 'physique',
                color: '#7c3aed',
                topics: 'Optique, Électrostatique, Chimie en solution',
            },

            // 2ème Math
            {
                name: 'Mathématiques Approfondies',
                code: 'MATH',
                slug: 'math-2math',
                filiere: '2ème Math',
                category: 'Sciences Exactes',
                description: 'Analyse approfondie, dénombrement, géométrie analytique, homothétie et arithmétique.',
                icon: 'math',
                color: '#4338ca',
                topics: 'Analyse approfondie, Dénombrement, Homothétie',
            },
            {
                name: 'Sciences Physiques Spécialisées',
                code: 'PHYSIQUE',
                slug: 'physique-2math',
                filiere: '2ème Math',
                category: 'Sciences Physiques',
                description: 'Cinématique du point, forces et équilibre, oxydoréduction et solutions acides/bases.',
                icon: 'physique',
                color: '#6d28d9',
                topics: 'Cinématique, Équilibre, Oxydoréduction',
            },
            {
                name: 'Sciences de la Vie et de la Terre',
                code: 'SVT',
                slug: 'svt-2math',
                filiere: '2ème Math',
                category: 'Sciences Naturelles',
                description: 'Génétique mendélienne, reproduction humaine et géodynamique interne.',
                icon: 'science',
                color: '#059669',
                topics: 'Génétique, Géodynamique, Reproduction',
            },
            {
                name: 'Informatique Générale',
                code: 'INFO',
                slug: 'info-2math',
                filiere: '2ème Math',
                category: 'Technologies',
                description: 'Introduction aux concepts algorithmiques et programmation élémentaire.',
                icon: 'informatique',
                color: '#0369a1',
                topics: 'Algorithmique, Python basique',
            },

            // Bac Informatique
            {
                name: 'Algorithmique Avancée & Données',
                code: 'ALGO-BAC',
                slug: 'algo-bac-info',
                filiere: 'Bac Informatique',
                category: 'Technologies',
                description: 'Tri avancés, récursivité, fichiers typés et non typés, algorithmes d arithmétique.',
                icon: 'informatique',
                color: '#2563eb',
                topics: 'Récursivité, Tri, Fichiers, Arithmétique algorithmique',
            },
            {
                name: 'Bases de Données & SQL',
                code: 'BDD',
                slug: 'bdd-bac-info',
                filiere: 'Bac Informatique',
                category: 'Technologies',
                description: 'Modélisation relationnelle, langage SQL (DDL & DML), intégrité et requêtes imbriquées.',
                icon: 'informatique',
                color: '#0284c7',
                topics: 'SQL, Modèle Relationnel, Normalisation, Requêtes complexes',
            },
            {
                name: 'Mathématiques pour l Informatique',
                code: 'MATH-BAC',
                slug: 'math-bac-info',
                filiere: 'Bac Informatique',
                category: 'Sciences Exactes',
                description: 'Probabilités, suites récurrentes, fonctions exponentielles et logarithmes, matrices.',
                icon: 'math',
                color: '#6366f1',
                topics: 'Exponentielle, Logarithme, Probabilités, Matrices',
            },
            {
                name: 'Physique - Chimie',
                code: 'PHYSIQUE-BAC',
                slug: 'physique-bac-info',
                filiere: 'Bac Informatique',
                category: 'Sciences Physiques',
                description: 'Dipôles RC, RL et RLC, ondes mécaniques, réactions acido-basiques et électrolyse.',
                icon: 'physique',
                color: '#7c3aed',
                topics: 'Dipôles RC/RL/RLC, Ondes, Acide-Base, Électrolyse',
            },
            {
                name: 'TIC & Technologies du Web',
                code: 'TIC-BAC',
                slug: 'tic-bac-info',
                filiere: 'Bac Informatique',
                category: 'Technologies',
                description: 'Développement web fullstack, JavaScript moderne, API REST et architecture réseau.',
                icon: 'informatique',
                color: '#0ea5e9',
                topics: 'JavaScript, Architecture Réseau, Sécurité, APIs',
            },
            {
                name: 'Français',
                code: 'FR-BAC',
                slug: 'francais-bac-info',
                filiere: 'Bac Informatique',
                category: 'Lettres & Langues',
                description: 'Méthodologie de l essai argumentatif, analyse textuelle et thématiques littéraires.',
                icon: 'francais',
                color: '#e11d48',
                topics: 'Essai argumentatif, Analyse de texte, Thèmes littéraires',
            },
            {
                name: 'Anglais',
                code: 'ANG-BAC',
                slug: 'anglais-bac-info',
                filiere: 'Bac Informatique',
                category: 'Langues Vivantes',
                description: 'Reading comprehension, technological innovations, advanced vocabulary and formal writing.',
                icon: 'anglais',
                color: '#d97706',
                topics: 'Reading comprehension, Writing tasks, Technology & Innovation',
            },
            {
                name: 'Philosophie',
                code: 'PHILO-BAC',
                slug: 'philo-bac-info',
                filiere: 'Bac Informatique',
                category: 'Sciences Humaines',
                description: 'La science et la technique, l État et la justice, la liberté et la condition humaine.',
                icon: 'philosophie',
                color: '#64748b',
                topics: 'Science & Technique, Morale & Politique, Liberté',
            },
        ];

        for (const s of defaultSubjects) {
            const exists = await this.subjectRepository.findOne({ where: { slug: s.slug } });
            if (!exists) {
                await this.subjectRepository.save(this.subjectRepository.create(s));
            }
        }
    }
}
