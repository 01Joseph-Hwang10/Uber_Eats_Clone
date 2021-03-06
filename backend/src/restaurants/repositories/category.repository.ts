import { Category } from '@restaurants/entities/category.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(Category)
export class CategoryRepository extends Repository<Category> {
  async getOrCreate(name: string): Promise<Category> {
    const categoryName = name
      .trim() // trim does stripping spaces at start and end
      .toLowerCase();
    const categorySlug = categoryName.replace(/ /g, '-');
    let category = await this.findOne({ slug: categorySlug });
    if (!category) {
      category = await this.save(
        this.create({ slug: categorySlug, name: categoryName }),
      );
    }
    return category;
  }
}
